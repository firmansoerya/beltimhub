import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json([]);

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  });
  if (!user) return NextResponse.json([]);

  // Gather UMKM IDs and categories user has interacted with
  const [orders, favorites, reviews, conversations] = await Promise.all([
    prisma.marketplaceOrder.findMany({
      where: { buyerId: user.id },
      select: { items: { select: { product: { select: { umkmId: true } } } } },
      take: 20,
    }),
    prisma.productFavorite.findMany({
      where: { userId: user.id },
      select: { product: { select: { umkmId: true } } },
      take: 20,
    }),
    prisma.umkmReview.findMany({
      where: { reviewerId: user.id },
      select: { umkmId: true },
      take: 20,
    }),
    prisma.conversation.findMany({
      where: { buyerId: user.id },
      select: { umkmId: true },
      take: 20,
    }),
  ]);

  // Collect unique UMKM IDs the user interacted with
  const interactedIds = new Set<string>();
  orders.forEach((o) => o.items.forEach((i) => { if (i.product.umkmId) interactedIds.add(i.product.umkmId); }));
  favorites.forEach((f) => { if (f.product.umkmId) interactedIds.add(f.product.umkmId); });
  reviews.forEach((r) => interactedIds.add(r.umkmId));
  conversations.forEach((c) => interactedIds.add(c.umkmId));

  if (interactedIds.size === 0) return NextResponse.json([]);

  // Get categories from interacted UMKM
  const interactedUmkm = await prisma.umkm.findMany({
    where: { id: { in: [...interactedIds] } },
    select: { category: true },
  });

  // Count category frequency
  const catCount = new Map<string, number>();
  interactedUmkm.forEach((u) => {
    catCount.set(u.category, (catCount.get(u.category) ?? 0) + 1);
  });

  // Sort categories by frequency
  const topCategories = [...catCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat);

  if (topCategories.length === 0) return NextResponse.json([]);

  // Find UMKM in those categories, excluding already interacted ones
  const recommendations = await prisma.umkm.findMany({
    where: {
      category: { in: topCategories },
      id: { notIn: [...interactedIds] },
    },
    orderBy: [{ isVerified: "desc" }, { createdAt: "desc" }],
    take: 6,
    select: {
      id: true,
      name: true,
      imageUrl: true,
      category: true,
      isVerified: true,
      _count: { select: { reviews: true } },
    },
  });

  return NextResponse.json(recommendations);
}
