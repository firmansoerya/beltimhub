import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ items: [], total: 0 });

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ items: [], total: 0 });

  const [
    unreadMessages,
    activeOrders,
    sellerPendingOrders,
    upcomingTickets,
    pendingReviews,
  ] = await Promise.all([
    // Pesan belum dibaca
    prisma.message.count({
      where: {
        OR: [
          { conversation: { buyerId: user.id } },
          { conversation: { sellerId: user.id } },
        ],
        senderId: { not: user.id },
        isRead: false,
      },
    }),
    // Pesanan buyer aktif (shipped = perlu konfirmasi)
    prisma.marketplaceOrder.count({
      where: { buyerId: user.id, orderStatus: "SHIPPED" },
    }),
    // Pesanan seller masuk (paid = perlu diproses)
    prisma.marketplaceOrder.count({
      where: { sellerId: user.id, orderStatus: "PAID" },
    }),
    // Tiket event besok (24 jam ke depan)
    prisma.ticket.count({
      where: {
        userId: user.id,
        paymentStatus: "PAID",
        event: {
          eventDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        },
      },
    }),
    // Ulasan belum dibalas (seller)
    prisma.umkmReview.count({
      where: { umkm: { ownerId: user.id }, ownerReply: null },
    }),
  ]);

  const items = [
    unreadMessages > 0 && {
      type: "message",
      label: `${unreadMessages} pesan belum dibaca`,
      href: "/dashboard/pesan",
      count: unreadMessages,
    },
    activeOrders > 0 && {
      type: "order",
      label: `${activeOrders} pesanan perlu dikonfirmasi`,
      href: "/dashboard/pesan",
      count: activeOrders,
    },
    sellerPendingOrders > 0 && {
      type: "seller_order",
      label: `${sellerPendingOrders} pesanan masuk perlu diproses`,
      href: "/dashboard/toko?tab=pesanan",
      count: sellerPendingOrders,
    },
    upcomingTickets > 0 && {
      type: "ticket",
      label: `${upcomingTickets} event dalam 24 jam`,
      href: "/dashboard/tiket",
      count: upcomingTickets,
    },
    pendingReviews > 0 && {
      type: "review",
      label: `${pendingReviews} ulasan belum dibalas`,
      href: "/dashboard/toko?tab=ulasan",
      count: pendingReviews,
    },
  ].filter(Boolean);

  const total = unreadMessages + activeOrders + sellerPendingOrders + upcomingTickets + pendingReviews;

  return NextResponse.json({ items, total });
}
