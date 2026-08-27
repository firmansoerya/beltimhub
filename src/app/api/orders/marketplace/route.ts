import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { PaymentRequest } from "xendit-node";
import { z } from "zod";
import { getMarketplaceFeeConfig, calculateOrderFees } from "@/lib/marketplace-fees";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const xenditPayment = new PaymentRequest({
  secretKey: process.env.XENDIT_SECRET_KEY ?? "",
});

const orderSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().positive(),
  })).min(1),
  shippingAddress: z.string().min(10),
  shippingNote: z.string().optional(),
  buyerNote: z.string().optional(),
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
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { items, shippingAddress, shippingNote, buyerNote, paymentMethod } = parsed.data;

  const buyer = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, fullName: true, email: true },
  });
  if (!buyer) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

  // Validasi produk & ambil data
  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, status: "ACTIVE" },
    include: { umkm: { select: { ownerId: true, name: true } } },
  });

  if (products.length !== productIds.length) {
    return NextResponse.json({ error: "Salah satu produk tidak tersedia" }, { status: 400 });
  }

  // Cek semua produk dari satu seller (1 order = 1 toko untuk simplisitas)
  const sellerIds = [...new Set(products.map((p) => p.umkm.ownerId))];
  if (sellerIds.length > 1) {
    return NextResponse.json({ error: "Satu order hanya bisa dari satu toko" }, { status: 400 });
  }
  const sellerId = sellerIds[0];

  if (sellerId === buyer.id) {
    return NextResponse.json({ error: "Tidak bisa membeli produk sendiri" }, { status: 400 });
  }

  // Cek stok
  for (const item of items) {
    const product = products.find((p) => p.id === item.productId)!;
    if (product.stock < item.quantity) {
      return NextResponse.json({ error: `Stok ${product.name} tidak cukup` }, { status: 400 });
    }
  }

  // Hitung total dengan fee config dari DB
  const orderItems = items.map((item) => {
    const product = products.find((p) => p.id === item.productId)!;
    return { productId: item.productId, quantity: item.quantity, price: product.price };
  });
  const subtotal = orderItems.reduce((s, i) => s + i.price * i.quantity, 0);

  const feeConfig = await getMarketplaceFeeConfig();
  const fees = calculateOrderFees(subtotal, paymentMethod, feeConfig);
  const platformFee = fees.buyerFee;
  const totalAmount = fees.totalAmount;
  const sellerAmount = fees.sellerAmount;

  // Generate invoice number: INV/YYYYMMDD/XXXXX
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const orderCountToday = await prisma.marketplaceOrder.count({
    where: { createdAt: { gte: todayStart } },
  });
  const seq = String(orderCountToday + 1).padStart(5, "0");
  const invoiceNumber = `INV/${dateStr}/${seq}`;

  // Buat order di DB
  const order = await prisma.marketplaceOrder.create({
    data: {
      buyerId: buyer.id,
      sellerId,
      invoiceNumber,
      totalAmount,
      platformFee,
      sellerAmount,
      shippingAddress,
      shippingNote,
      buyerNote,
      xenditRefId: `ORDER-${Date.now()}`,
      items: { create: orderItems },
    },
  });

  // Buat payment di Xendit
  const description = `Belanja di ${products[0].umkm.name} - BeltimHub`;
  const referenceId = order.xenditRefId!;

  try {
    if (paymentMethod.endsWith("_VA")) {
      const bankCode = paymentMethod.replace("_VA", "");
      const result = await xenditPayment.createPaymentRequest({
        data: {
          referenceId,
          amount: totalAmount,
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
          metadata: { orderId: order.id, type: "marketplace" },
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const va = (result as any)?.paymentMethod?.virtualAccount;
      const vaNumber = va?.channelProperties?.virtualAccountNumber ?? "";
      const vaExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await prisma.marketplaceOrder.update({
        where: { id: order.id },
        data: { xenditId: result.id, paymentMethod, vaNumber, vaExpiry },
      });

      return NextResponse.json({ orderId: order.id, type: "VA", vaNumber, vaBank: bankCode, vaExpiry }, { status: 201 });

    } else if (paymentMethod === "QRIS") {
      if (totalAmount > 10_000_000) {
        return NextResponse.json({ error: "QRIS maksimal Rp 10.000.000" }, { status: 400 });
      }
      const result = await xenditPayment.createPaymentRequest({
        data: {
          referenceId,
          amount: totalAmount,
          currency: "IDR",
          paymentMethod: {
            type: "QR_CODE",
            reusability: "ONE_TIME_USE",
            qrCode: { channelCode: "QRIS" },
          },
          description,
          metadata: { orderId: order.id, type: "marketplace" },
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const qrString = (result as any)?.paymentMethod?.qrCode?.channelProperties?.qrString ?? "";
      const vaExpiry = new Date(Date.now() + 30 * 60 * 1000);

      await prisma.marketplaceOrder.update({
        where: { id: order.id },
        data: { xenditId: result.id, paymentMethod, qrString, vaExpiry },
      });

      return NextResponse.json({ orderId: order.id, type: "QRIS", qrString, vaExpiry }, { status: 201 });

    } else {
      // E-wallet
      const channelCode = paymentMethod as "OVO" | "DANA" | "SHOPEEPAY" | "LINKAJA";
      const result = await xenditPayment.createPaymentRequest({
        data: {
          referenceId,
          amount: totalAmount,
          currency: "IDR",
          paymentMethod: {
            type: "EWALLET",
            reusability: "ONE_TIME_USE",
            ewallet: {
              channelCode,
              channelProperties: {
                successReturnUrl: `${APP_URL}/orders/${order.id}?status=success`,
                failureReturnUrl: `${APP_URL}/pasar-lokal?status=failed`,
                cancelReturnUrl: `${APP_URL}/pasar-lokal`,
              },
            },
          },
          description,
          metadata: { orderId: order.id, type: "marketplace" },
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const checkoutUrl = (result as any)?.actions?.find((a: any) => a.action === "AUTH")?.url ?? null;

      await prisma.marketplaceOrder.update({
        where: { id: order.id },
        data: { xenditId: result.id, paymentMethod },
      });

      return NextResponse.json({ orderId: order.id, type: "EWALLET", checkoutUrl }, { status: 201 });
    }
  } catch (err) {
    // Rollback order jika payment gagal
    await prisma.marketplaceOrder.update({
      where: { id: order.id },
      data: { orderStatus: "CANCELLED" },
    });
    console.error("[marketplace-order] xendit error:", err);
    return NextResponse.json({ error: "Gagal membuat pembayaran" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role") ?? "buyer"; // "buyer" | "seller"

  const orders = await prisma.marketplaceOrder.findMany({
    where: role === "seller" ? { sellerId: user.id } : { buyerId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: { product: { select: { name: true, images: true } } },
      },
      buyer: { select: { fullName: true, avatarUrl: true } },
      seller: { select: { fullName: true, avatarUrl: true } },
    },
  });

  return NextResponse.json(orders);
}
