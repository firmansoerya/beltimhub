import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseShippingConfig } from "@/lib/constants";
import { TokoClient } from "./TokoClient";

export default async function TokoPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, fullName: true, avatarUrl: true },
  });
  if (!user) redirect("/sign-in");

  // UMKM milik user (semua)
  const allUmkm = await prisma.umkm.findMany({
    where: { ownerId: user.id },
    select: {
      id: true, name: true, marketplaceStatus: true, category: true,
      description: true, address: true, phone: true, instagram: true,
      website: true, mapsUrl: true, imageUrl: true,
      shippingMethods: true,
      shippingConfig: true,
      operatingHours: true, replyTime: true,
      bankName: true, bankAccountNumber: true, bankAccountName: true,
    },
  });

  const marketplaceUmkm = allUmkm.filter(u => u.marketplaceStatus === "APPROVED");
  const umkmIds = marketplaceUmkm.map(u => u.id);
  const hasMarketplaceUmkm = marketplaceUmkm.length > 0;

  // Conversations sebagai SELLER
  const sellerConvs = await prisma.conversation.findMany({
    where: { sellerId: user.id },
    include: {
      buyer:  { select: { id: true, fullName: true, avatarUrl: true } },
      seller: { select: { id: true, fullName: true, avatarUrl: true } },
      umkm:   { select: { id: true, name: true, imageUrl: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  const convUnreadCounts = await Promise.all(
    sellerConvs.map((c) =>
      prisma.message.count({
        where: { conversationId: c.id, senderId: { not: user.id }, isRead: false },
      })
    )
  );

  const serializedConvs = sellerConvs.map((c, i) => ({
    id: c.id,
    buyer: c.buyer, seller: c.seller, umkm: c.umkm,
    lastMessage: c.messages[0]
      ? { content: c.messages[0].content, createdAt: c.messages[0].createdAt.toISOString(), senderId: c.messages[0].senderId }
      : null,
    unreadCount: convUnreadCounts[i],
    updatedAt: c.updatedAt.toISOString(),
  }));

  const [products, orders, reviews] = await Promise.all([
    // Produk dari UMKM marketplace
    umkmIds.length > 0
      ? prisma.product.findMany({
          where: { umkmId: { in: umkmIds }, status: { not: "DELETED" } },
          orderBy: { createdAt: "desc" },
          include: { umkm: { select: { name: true } } },
        })
      : [],

    // Pesanan sebagai seller
    prisma.marketplaceOrder.findMany({
      where: { sellerId: user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        items: { include: { product: { select: { name: true, images: true } } } },
        buyer: { select: { fullName: true } },
      },
    }),

    // Ulasan di semua UMKM milik user
    umkmIds.length > 0
      ? prisma.umkmReview.findMany({
          where: { umkmId: { in: umkmIds } },
          include: {
            reviewer: { select: { fullName: true, avatarUrl: true } },
            umkm: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      : [],
  ]);

  const serializedProducts = products.map(p => ({
    id: p.id, name: p.name, price: p.price, stock: p.stock,
    images: p.images, status: p.status,
    umkm: p.umkm,
  }));

  const serializedOrders = orders.map(o => ({
    id: o.id, orderStatus: o.orderStatus, sellerAmount: o.sellerAmount,
    trackingNumber: o.trackingNumber, courier: o.courier,
    createdAt: o.createdAt.toISOString(),
    buyer: o.buyer,
    items: o.items.map(item => ({
      id: item.id, quantity: item.quantity, price: item.price,
      product: item.product,
    })),
  }));

  const serializedReviews = reviews.map(r => ({
    id: r.id, umkmId: r.umkmId, umkmName: r.umkm.name,
    rating: r.rating, comment: r.comment,
    ownerReply: r.ownerReply, ownerRepliedAt: r.ownerRepliedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    reviewer: r.reviewer,
  }));

  const { tab } = await searchParams;
  const validTabs = ["ringkasan", "produk", "pesanan", "saldo", "ulasan", "chat", "pengaturan"];
  const initialTab = validTabs.includes(tab ?? "") ? (tab as "ringkasan" | "produk" | "pesanan" | "saldo" | "ulasan" | "chat" | "pengaturan") : "ringkasan";

  // Data UMKM marketplace pertama untuk tab pengaturan
  const settingsUmkm = marketplaceUmkm[0] ?? null;
  const umkmSettings = settingsUmkm ? {
    id: settingsUmkm.id,
    name: settingsUmkm.name,
    category: settingsUmkm.category,
    description: settingsUmkm.description ?? "",
    address: settingsUmkm.address ?? "",
    phone: settingsUmkm.phone ?? "",
    instagram: settingsUmkm.instagram ?? "",
    website: settingsUmkm.website ?? "",
    mapsUrl: settingsUmkm.mapsUrl ?? "",
    imageUrl: settingsUmkm.imageUrl ?? "",
    shippingConfig: parseShippingConfig(settingsUmkm.shippingConfig),
    operatingHours: settingsUmkm.operatingHours ?? "",
    replyTime: settingsUmkm.replyTime ?? "",
    bankName: settingsUmkm.bankName ?? "",
    bankAccountNumber: settingsUmkm.bankAccountNumber ?? "",
    bankAccountName: settingsUmkm.bankAccountName ?? "",
  } : null;

  return (
    <TokoClient
      currentUser={{ id: user.id, fullName: user.fullName, avatarUrl: user.avatarUrl }}
      umkmList={allUmkm.map(u => ({ id: u.id, name: u.name }))}
      products={serializedProducts}
      orders={serializedOrders}
      reviews={serializedReviews}
      conversations={serializedConvs}
      hasMarketplaceUmkm={hasMarketplaceUmkm}
      umkmSettings={umkmSettings}
      initialTab={initialTab}
    />
  );
}
