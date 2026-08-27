import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { PaymentRequest } from "xendit-node";
import { z } from "zod";
import { getMarketplaceFeeConfig, calculateOrderFees, calculateSellerFee } from "@/lib/marketplace-fees";
import { parseShippingConfig, type ShippingMethodKey, SHIPPING_METHOD_KEYS } from "@/lib/constants";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const xenditPayment = new PaymentRequest({
  secretKey: process.env.XENDIT_SECRET_KEY ?? "",
});

const checkoutSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().positive(),
    note: z.string().optional(),
  })).min(1),
  shippingAddress: z.string().min(10),
  shippingMethod: z.enum(["PICKUP", "LOCAL_COURIER", "CROSS_DISTRICT", "INTER_ISLAND", "DIGITAL"]),
  paymentMethod: z.enum([
    "BCA_VA", "BNI_VA", "BRI_VA", "MANDIRI_VA", "PERMATA_VA", "BSI_VA",
    "CIMB_VA", "BJB_VA",
    "QRIS",
    "OVO", "DANA", "SHOPEEPAY", "LINKAJA",
  ]),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Login diperlukan" }, { status: 401 });

  const body = await req.json();
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { items, shippingAddress, shippingMethod, paymentMethod } = parsed.data;

  const buyer = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, fullName: true, email: true },
  });
  if (!buyer) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

  // Validasi produk & ambil data
  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, status: "ACTIVE" },
    include: { umkm: { select: { id: true, ownerId: true, name: true, shippingConfig: true } } },
  });

  if (products.length !== productIds.length) {
    return NextResponse.json({ error: "Salah satu produk tidak tersedia" }, { status: 400 });
  }

  // Cek tidak beli produk sendiri
  const selfProducts = products.filter((p) => p.umkm.ownerId === buyer.id);
  if (selfProducts.length > 0) {
    return NextResponse.json({ error: "Tidak bisa membeli produk sendiri" }, { status: 400 });
  }

  // Cek stok
  for (const item of items) {
    const product = products.find((p) => p.id === item.productId)!;
    if (product.stock < item.quantity) {
      return NextResponse.json({ error: `Stok ${product.name} tidak cukup` }, { status: 400 });
    }
  }

  // Validasi metode pengiriman per toko
  const umkmConfigs = new Map<string, ReturnType<typeof parseShippingConfig>>();
  for (const p of products) {
    if (!umkmConfigs.has(p.umkm.id)) {
      umkmConfigs.set(p.umkm.id, parseShippingConfig(p.umkm.shippingConfig));
    }
  }

  // Cek apakah semua toko mendukung metode ini
  const unsupportedStores: string[] = [];
  const checkedUmkms = new Set<string>();
  for (const p of products) {
    if (checkedUmkms.has(p.umkm.id)) continue;
    checkedUmkms.add(p.umkm.id);
    const config = umkmConfigs.get(p.umkm.id)!;
    if (!config[shippingMethod]?.enabled) {
      unsupportedStores.push(p.umkm.name);
    }
  }
  if (unsupportedStores.length > 0) {
    return NextResponse.json({
      error: `Toko ${unsupportedStores.join(", ")} tidak mendukung metode pengiriman ini`,
    }, { status: 400 });
  }

  // Group items by seller (umkm owner)
  const storeGroups: Record<string, {
    sellerId: string;
    umkmId: string;
    umkmName: string;
    items: { productId: string; quantity: number; price: number; note?: string }[];
  }> = {};

  for (const item of items) {
    const product = products.find((p) => p.id === item.productId)!;
    const sellerId = product.umkm.ownerId;
    if (!storeGroups[sellerId]) {
      storeGroups[sellerId] = { sellerId, umkmId: product.umkm.id, umkmName: product.umkm.name, items: [] };
    }
    storeGroups[sellerId].items.push({
      productId: item.productId,
      quantity: item.quantity,
      price: product.price,
      note: item.note,
    });
  }

  const stores = Object.values(storeGroups);

  // Hitung ongkir per toko berdasarkan shippingMethod & shippingConfig
  const shippingPerStore: Record<string, number> = {};
  for (const store of stores) {
    const config = umkmConfigs.get(store.umkmId)!;
    const methodConfig = config[shippingMethod];
    const storeSubtotal = store.items.reduce((s, i) => s + i.price * i.quantity, 0);

    // Cek gratis ongkir
    if (methodConfig.freeMinimum > 0 && storeSubtotal >= methodConfig.freeMinimum) {
      shippingPerStore[store.sellerId] = 0;
    } else {
      shippingPerStore[store.sellerId] = methodConfig.fee;
    }
  }
  const totalShippingFee = Object.values(shippingPerStore).reduce((s, f) => s + f, 0);

  // Hitung fee berdasarkan grand total (1x fee untuk seluruh checkout)
  const feeConfig = await getMarketplaceFeeConfig();
  const grandSubtotal = items.reduce((s, item) => {
    const product = products.find((p) => p.id === item.productId)!;
    return s + product.price * item.quantity;
  }, 0);

  const grandFees = calculateOrderFees(grandSubtotal, paymentMethod, feeConfig);
  const grandTotal = grandFees.totalAmount + totalShippingFee; // subtotal + buyerFee + ongkir
  const totalPlatformFee = grandFees.buyerFee;

  if (paymentMethod === "QRIS" && grandTotal > 10_000_000) {
    return NextResponse.json({ error: "QRIS maksimal Rp 10.000.000" }, { status: 400 });
  }

  // Generate invoice numbers & buat orders dalam transaction
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const orderCountToday = await prisma.marketplaceOrder.count({
    where: { createdAt: { gte: todayStart } },
  });

  const checkoutRefId = `CHECKOUT-${Date.now()}`;

  // Buat checkout session + orders dalam 1 transaction
  const session = await prisma.$transaction(async (tx) => {
    const checkoutSession = await tx.checkoutSession.create({
      data: {
        buyerId: buyer.id,
        totalAmount: grandTotal,
        totalPlatformFee,
        totalShippingFee,
        paymentMethod,
        xenditRefId: checkoutRefId,
      },
    });

    const grandBuyerFee = grandFees.buyerFee;
    let distributedBuyerFee = 0;

    let seq = orderCountToday;
    for (let si = 0; si < stores.length; si++) {
      const store = stores[si];
      seq++;
      const invoiceNumber = `INV/${dateStr}/${String(seq).padStart(5, "0")}`;

      const storeSubtotal = store.items.reduce((s, i) => s + i.price * i.quantity, 0);

      const isLastStore = si === stores.length - 1;
      const storeBuyerFee = isLastStore
        ? grandBuyerFee - distributedBuyerFee
        : Math.round(grandBuyerFee * storeSubtotal / grandSubtotal);
      distributedBuyerFee += storeBuyerFee;

      const storeShippingFee = shippingPerStore[store.sellerId] ?? 0;

      const sellerFee = calculateSellerFee(storeSubtotal, feeConfig);
      const storeTotalAmount = storeSubtotal + storeBuyerFee + storeShippingFee;
      const storeSellerAmount = storeSubtotal - sellerFee + storeShippingFee;

      const storeNotes = store.items
        .filter(i => i.note?.trim())
        .map(i => {
          const product = products.find(p => p.id === i.productId)!;
          return `[${product.name}] ${i.note!.trim()}`;
        });
      const combinedNote = storeNotes.length > 0 ? storeNotes.join("\n") : undefined;

      await tx.marketplaceOrder.create({
        data: {
          checkoutSessionId: checkoutSession.id,
          buyerId: buyer.id,
          sellerId: store.sellerId,
          invoiceNumber,
          totalAmount: storeTotalAmount,
          platformFee: storeBuyerFee,
          shippingFee: storeShippingFee,
          shippingMethod,
          sellerAmount: storeSellerAmount,
          paymentMethod,
          shippingAddress,
          buyerNote: combinedNote,
          xenditRefId: `ORDER-${Date.now()}-${seq}`,
          items: {
            create: store.items.map(i => ({
              productId: i.productId,
              quantity: i.quantity,
              price: i.price,
            })),
          },
        },
      });

      for (const item of store.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }

    return checkoutSession;
  });

  // Buat 1 payment di Xendit untuk seluruh checkout
  const storeNames = stores.map(s => s.umkmName).join(", ");
  const description = `Belanja di ${storeNames} - BeltimHub`;
  const referenceId = checkoutRefId;

  try {
    if (paymentMethod.endsWith("_VA")) {
      const bankCode = paymentMethod.replace("_VA", "");
      const result = await xenditPayment.createPaymentRequest({
        data: {
          referenceId,
          amount: grandTotal,
          currency: "IDR",
          paymentMethod: {
            type: "VIRTUAL_ACCOUNT",
            reusability: "ONE_TIME_USE",
            virtualAccount: {
              channelCode: bankCode as "BCA" | "BNI" | "BRI" | "MANDIRI" | "PERMATA" | "BSI" | "CIMB" | "BJB",
              channelProperties: {
                customerName: buyer.fullName,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              },
            },
          },
          description,
          metadata: { checkoutSessionId: session.id, type: "marketplace_checkout" },
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const va = (result as any)?.paymentMethod?.virtualAccount;
      const vaNumber = va?.channelProperties?.virtualAccountNumber ?? "";
      const vaExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await prisma.checkoutSession.update({
        where: { id: session.id },
        data: { xenditId: result.id, vaNumber, vaExpiry },
      });

      return NextResponse.json({
        checkoutSessionId: session.id,
        type: "VA",
        vaNumber,
        vaBank: bankCode,
        vaExpiry,
      }, { status: 201 });

    } else if (paymentMethod === "QRIS") {
      const result = await xenditPayment.createPaymentRequest({
        data: {
          referenceId,
          amount: grandTotal,
          currency: "IDR",
          paymentMethod: {
            type: "QR_CODE",
            reusability: "ONE_TIME_USE",
            qrCode: { channelCode: "QRIS" },
          },
          description,
          metadata: { checkoutSessionId: session.id, type: "marketplace_checkout" },
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const qrString = (result as any)?.paymentMethod?.qrCode?.channelProperties?.qrString ?? "";
      const vaExpiry = new Date(Date.now() + 30 * 60 * 1000);

      await prisma.checkoutSession.update({
        where: { id: session.id },
        data: { xenditId: result.id, qrString, vaExpiry },
      });

      return NextResponse.json({
        checkoutSessionId: session.id,
        type: "QRIS",
        qrString,
        vaExpiry,
      }, { status: 201 });

    } else {
      const channelCode = paymentMethod as "OVO" | "DANA" | "SHOPEEPAY" | "LINKAJA";
      const result = await xenditPayment.createPaymentRequest({
        data: {
          referenceId,
          amount: grandTotal,
          currency: "IDR",
          paymentMethod: {
            type: "EWALLET",
            reusability: "ONE_TIME_USE",
            ewallet: {
              channelCode,
              channelProperties: {
                successReturnUrl: `${APP_URL}/orders/checkout/${session.id}?status=success`,
                failureReturnUrl: `${APP_URL}/pasar-lokal?status=failed`,
                cancelReturnUrl: `${APP_URL}/pasar-lokal`,
              },
            },
          },
          description,
          metadata: { checkoutSessionId: session.id, type: "marketplace_checkout" },
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const checkoutUrl = (result as any)?.actions?.find((a: any) => a.action === "AUTH")?.url ?? null;

      await prisma.checkoutSession.update({
        where: { id: session.id },
        data: { xenditId: result.id },
      });

      return NextResponse.json({
        checkoutSessionId: session.id,
        type: "EWALLET",
        checkoutUrl,
      }, { status: 201 });
    }
  } catch (err) {
    await prisma.marketplaceOrder.updateMany({
      where: { checkoutSessionId: session.id },
      data: { orderStatus: "CANCELLED" },
    });
    await prisma.checkoutSession.update({
      where: { id: session.id },
      data: { status: "FAILED" },
    });
    console.error("[marketplace-checkout] xendit error:", err);
    return NextResponse.json({ error: "Gagal membuat pembayaran" }, { status: 500 });
  }
}
