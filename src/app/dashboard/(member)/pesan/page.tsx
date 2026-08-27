import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InboxClient } from "./InboxClient";

export default async function PesanPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; conv?: string; prefill?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { tab, conv, prefill } = await searchParams;

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, fullName: true, avatarUrl: true },
  });
  if (!user) redirect("/sign-in");

  // Conversations sebagai BUYER saja (chat penjual ada di dashboard toko)
  const conversations = await prisma.conversation.findMany({
    where: { buyerId: user.id },
    include: {
      buyer:  { select: { id: true, fullName: true, avatarUrl: true } },
      seller: { select: { id: true, fullName: true, avatarUrl: true } },
      umkm:   { select: { id: true, name: true, imageUrl: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  const unreadCounts = await Promise.all(
    conversations.map((c) =>
      prisma.message.count({
        where: { conversationId: c.id, senderId: { not: user.id }, isRead: false },
      })
    )
  );

  const serializedConvs = conversations.map((c, i) => ({
    id: c.id,
    buyer: c.buyer, seller: c.seller, umkm: c.umkm,
    lastMessage: c.messages[0]
      ? { content: c.messages[0].content, createdAt: c.messages[0].createdAt.toISOString(), senderId: c.messages[0].senderId }
      : null,
    unreadCount: unreadCounts[i],
    updatedAt: c.updatedAt.toISOString(),
  }));

  // Pesanan sebagai buyer
  const orders = await prisma.marketplaceOrder.findMany({
    where: { buyerId: user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      items: { include: { product: { select: { name: true, images: true } } } },
      seller: { select: { fullName: true } },
    },
  });

  const serializedOrders = orders.map((o) => ({
    id: o.id, invoiceNumber: o.invoiceNumber ?? null, orderStatus: o.orderStatus, totalAmount: o.totalAmount,
    shippingAddress: o.shippingAddress, trackingNumber: o.trackingNumber, courier: o.courier,
    createdAt: o.createdAt.toISOString(), paidAt: o.paidAt?.toISOString() ?? null,
    shippedAt: o.shippedAt?.toISOString() ?? null, completedAt: o.completedAt?.toISOString() ?? null,
    seller: o.seller,
    items: o.items.map((item) => ({ id: item.id, quantity: item.quantity, price: item.price, product: item.product })),
  }));

  // Ulasan yang pernah ditulis oleh user (sebagai reviewer)
  const buyerReviewsRaw = await prisma.umkmReview.findMany({
    where: { reviewerId: user.id },
    include: { umkm: { select: { id: true, name: true, imageUrl: true } } },
    orderBy: { createdAt: "desc" },
  });

  const buyerReviews = buyerReviewsRaw.map((r) => ({
    id: r.id,
    umkmId: r.umkmId, umkmName: r.umkm.name, umkmImageUrl: r.umkm.imageUrl,
    rating: r.rating, comment: r.comment,
    createdAt: r.createdAt.toISOString(),
  }));

  // UMKM dari pesanan selesai yang belum diulas oleh user
  const completedOrders = await prisma.marketplaceOrder.findMany({
    where: { buyerId: user.id, orderStatus: "COMPLETED" },
    include: {
      items: {
        take: 1,
        include: {
          product: {
            select: {
              images: true,
              umkm: { select: { id: true, name: true, imageUrl: true } },
            },
          },
        },
      },
    },
    orderBy: { completedAt: "desc" },
  });

  const reviewedUmkmIds = new Set(buyerReviewsRaw.map((r) => r.umkmId));
  const pendingMap = new Map<string, { umkmId: string; umkmName: string; umkmImageUrl: string | null; productImages: string[] }>();

  for (const order of completedOrders) {
    const item = order.items[0];
    if (!item) continue;
    const umkm = item.product.umkm;
    if (!reviewedUmkmIds.has(umkm.id) && !pendingMap.has(umkm.id)) {
      pendingMap.set(umkm.id, {
        umkmId: umkm.id, umkmName: umkm.name, umkmImageUrl: umkm.imageUrl,
        productImages: item.product.images,
      });
    }
  }

  const pendingReviews = Array.from(pendingMap.values());

  // Favorit produk
  const favorites = await prisma.productFavorite.findMany({
    where: { userId: user.id },
    include: {
      product: {
        select: { id: true, name: true, price: true, images: true, stock: true, status: true,
          umkm: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const serializedFavorites = favorites
    .filter(f => f.product.status === "ACTIVE")
    .map(f => ({
      id: f.id, productId: f.product.id, name: f.product.name,
      price: f.product.price, image: f.product.images[0] ?? null,
      stock: f.product.stock, umkmName: f.product.umkm.name,
      createdAt: f.createdAt.toISOString(),
    }));

  const validTabs = ["chat", "pesanan", "ulasan", "favorit"];
  const initialTab = validTabs.includes(tab ?? "") ? (tab as "chat" | "pesanan" | "ulasan" | "favorit") : "chat";

  return (
    <InboxClient
      currentUser={{ id: user.id, fullName: user.fullName, avatarUrl: user.avatarUrl }}
      conversations={serializedConvs}
      orders={serializedOrders}
      buyerReviews={buyerReviews}
      pendingReviews={pendingReviews}
      favorites={serializedFavorites}
      initialTab={initialTab}
      initialConvId={conv ?? null}
      initialPrefill={prefill ?? null}
    />
  );
}
