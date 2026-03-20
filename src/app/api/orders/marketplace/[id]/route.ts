import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  action: z.enum([
    "confirm_shipped",    // seller: konfirmasi sudah kirim
    "confirm_received",   // buyer: konfirmasi terima barang
    "cancel",             // buyer/seller: batalkan (hanya saat WAITING_PAYMENT atau PAID+seller)
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
          product: { select: { id: true, name: true, images: true, price: true } },
        },
      },
      buyer: { select: { fullName: true, avatarUrl: true, email: true, phoneNumber: true } },
      seller: { select: { fullName: true, avatarUrl: true } },
    },
  });

  if (!order) return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });

  const isParticipant = order.buyerId === user.id || order.sellerId === user.id;
  if (!isParticipant && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  return NextResponse.json(order);
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

  if (action === "confirm_shipped") {
    if (!isSeller && !isAdmin) return NextResponse.json({ error: "Hanya seller yang bisa konfirmasi pengiriman" }, { status: 403 });
    if (order.orderStatus !== "PAID" && order.orderStatus !== "PROCESSING") {
      return NextResponse.json({ error: "Order belum dibayar" }, { status: 400 });
    }
    updateData = { orderStatus: "SHIPPED", shippedAt: new Date(), trackingNumber, courier };

  } else if (action === "confirm_received") {
    if (!isBuyer && !isAdmin) return NextResponse.json({ error: "Hanya buyer yang bisa konfirmasi terima" }, { status: 403 });
    if (order.orderStatus !== "SHIPPED") {
      return NextResponse.json({ error: "Order belum dikirim" }, { status: 400 });
    }
    updateData = { orderStatus: "COMPLETED", completedAt: new Date() };

  } else if (action === "cancel") {
    if (order.orderStatus === "COMPLETED" || order.orderStatus === "SHIPPED") {
      return NextResponse.json({ error: "Order tidak bisa dibatalkan setelah dikirim" }, { status: 400 });
    }
    if (!isBuyer && !isSeller && !isAdmin) {
      return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
    }
    updateData = { orderStatus: "CANCELLED", cancelledAt: new Date() };
  }

  const updated = await prisma.marketplaceOrder.update({ where: { id }, data: updateData });
  return NextResponse.json(updated);
}
