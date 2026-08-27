import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  action: z.enum([
    "accept_order",       // seller: terima & proses pesanan (PAID → PROCESSING)
    "confirm_shipped",    // seller: konfirmasi sudah kirim (PROCESSING → SHIPPED)
    "confirm_received",   // buyer: konfirmasi terima barang (SHIPPED → COMPLETED)
    "cancel",             // buyer: batalkan (hanya sebelum seller accept/PROCESSING)
  ]),
  trackingNumber: z.string().optional(),
  courier: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true, role: true } });
  if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

  const order = await prisma.marketplaceOrder.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, images: true, price: true, umkmId: true, umkm: { select: { name: true } } } },
        },
      },
      buyer: { select: { fullName: true, avatarUrl: true, email: true, phoneNumber: true } },
      seller: { select: { fullName: true, avatarUrl: true } },
    },
  });

  if (!order) return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });

  const isBuyer = order.buyerId === user.id;
  const isSeller = order.sellerId === user.id;
  if (!isBuyer && !isSeller && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  // Tambahkan role user saat ini untuk frontend
  const viewerRole = isBuyer ? "buyer" : isSeller ? "seller" : "admin";
  return NextResponse.json({ ...order, viewerRole });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { action, trackingNumber, courier } = parsed.data;

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true, role: true } });
  if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

  const order = await prisma.marketplaceOrder.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });

  const isBuyer = order.buyerId === user.id;
  const isSeller = order.sellerId === user.id;
  const isAdmin = user.role === "ADMIN";

  if (!isBuyer && !isSeller && !isAdmin) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  let updateData: Record<string, unknown> = {};

  if (action === "accept_order") {
    // Seller menerima & memproses pesanan
    if (!isSeller && !isAdmin) return NextResponse.json({ error: "Hanya seller yang bisa menerima pesanan" }, { status: 403 });
    if (order.orderStatus !== "PAID") {
      return NextResponse.json({ error: "Pesanan harus berstatus PAID untuk dikonfirmasi" }, { status: 400 });
    }
    updateData = { orderStatus: "PROCESSING" };

  } else if (action === "confirm_shipped") {
    // Seller konfirmasi pengiriman (harus sudah PROCESSING)
    if (!isSeller && !isAdmin) return NextResponse.json({ error: "Hanya seller yang bisa konfirmasi pengiriman" }, { status: 403 });
    if (order.orderStatus !== "PROCESSING") {
      return NextResponse.json({ error: "Pesanan harus diproses dulu sebelum dikirim" }, { status: 400 });
    }
    updateData = { orderStatus: "SHIPPED", shippedAt: new Date(), trackingNumber, courier };

  } else if (action === "confirm_received") {
    // Buyer konfirmasi barang diterima
    if (!isBuyer && !isAdmin) return NextResponse.json({ error: "Hanya buyer yang bisa konfirmasi terima" }, { status: 403 });
    if (order.orderStatus !== "SHIPPED") {
      return NextResponse.json({ error: "Order belum dikirim" }, { status: 400 });
    }
    // Update order + accumulate seller balance in transaction
    const now = new Date();
    await prisma.$transaction([
      prisma.marketplaceOrder.update({ where: { id }, data: { orderStatus: "COMPLETED", completedAt: now } }),
      prisma.sellerBalance.upsert({
        where: { sellerId: order.sellerId },
        create: { sellerId: order.sellerId, totalEarnings: order.sellerAmount, availableBalance: order.sellerAmount },
        update: { totalEarnings: { increment: order.sellerAmount }, availableBalance: { increment: order.sellerAmount } },
      }),
      prisma.balanceLedger.create({
        data: {
          sellerId: order.sellerId, type: "ORDER_COMPLETED",
          amount: order.sellerAmount, referenceId: id,
          note: `Pesanan ${order.invoiceNumber ?? id} selesai`,
        },
      }),
    ]);
    const updated = await prisma.marketplaceOrder.findUnique({ where: { id } });
    return NextResponse.json(updated);

  } else if (action === "cancel") {
    // Buyer hanya bisa cancel sebelum seller accept (WAITING_PAYMENT atau PAID)
    if (!isBuyer && !isAdmin) {
      return NextResponse.json({ error: "Hanya buyer yang bisa membatalkan pesanan" }, { status: 403 });
    }
    if (order.orderStatus !== "WAITING_PAYMENT" && order.orderStatus !== "PAID") {
      return NextResponse.json({ error: "Pesanan tidak bisa dibatalkan setelah diproses seller" }, { status: 400 });
    }
    updateData = { orderStatus: "CANCELLED", cancelledAt: new Date() };
  }

  const updated = await prisma.marketplaceOrder.update({ where: { id }, data: updateData });
  return NextResponse.json(updated);
}
