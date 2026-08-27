export const revalidate = 60;

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { parseShippingConfig } from "@/lib/constants";
import { StoreFrontClient } from "./StoreFrontClient";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const umkm = await prisma.umkm.findUnique({
    where: { id },
    select: { name: true, description: true, imageUrl: true, category: true },
  });

  if (!umkm) {
    return { title: "UMKM Tidak Ditemukan | BeltimHub" };
  }

  const description = (umkm.description ?? "")
    .replace(/<[^>]*>/g, "")
    .slice(0, 160) || `${umkm.name} - ${umkm.category}`;

  return {
    title: `${umkm.name} | UMKM BeltimHub`,
    description,
    openGraph: {
      title: `${umkm.name} | UMKM BeltimHub`,
      description,
      images: umkm.imageUrl ? [umkm.imageUrl] : [],
    },
  };
}

export default async function UmkmDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await auth();

  const [umkm, currentUser] = await Promise.all([
    prisma.umkm.findUnique({
      where: { id },
      include: {
        reviews: {
          include: { reviewer: { select: { fullName: true, avatarUrl: true } } },
          orderBy: { createdAt: "desc" },
        },
        products: {
          where: { status: "ACTIVE" },
          orderBy: [{ soldCount: "desc" }, { createdAt: "desc" }],
        },
      },
    }),
    userId ? prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } }) : null,
  ]);

  if (!umkm) notFound();

  const isOwner = !!currentUser && currentUser.id === umkm.ownerId;
  const myReview = currentUser ? umkm.reviews.find((r) => r.reviewerId === currentUser.id) : null;

  return (
    <StoreFrontClient
      umkm={{
        ...umkm,
        marketplaceStatus: umkm.marketplaceStatus,
        shippingMethods: umkm.shippingMethods ?? [],
        shippingConfig: parseShippingConfig(umkm.shippingConfig),
        operatingHours: umkm.operatingHours ?? null,
        replyTime: umkm.replyTime ?? null,
        createdAt: umkm.createdAt.toISOString(),
        reviews: umkm.reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          ownerReply: r.ownerReply,
          ownerRepliedAt: r.ownerRepliedAt?.toISOString() ?? null,
          createdAt: r.createdAt.toISOString(),
          reviewer: r.reviewer,
        })),
        products: umkm.products.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          stock: p.stock,
          images: p.images,
          category: p.category,
          soldCount: p.soldCount,
        })),
      }}
      isOwner={isOwner}
      myReview={myReview ? { id: myReview.id, rating: myReview.rating, comment: myReview.comment } : null}
      isLoggedIn={!!currentUser}
      currentUserId={currentUser?.id ?? null}
    />
  );
}
