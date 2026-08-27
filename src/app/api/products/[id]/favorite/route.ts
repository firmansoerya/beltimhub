import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// GET — cek apakah produk difavoritkan
export async function GET(_req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ favorited: false });

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ favorited: false });

  const { id } = await params;
  const fav = await prisma.productFavorite.findUnique({
    where: { userId_productId: { userId: user.id, productId: id } },
  });

  return NextResponse.json({ favorited: !!fav });
}

// POST — toggle favorite
export async function POST(_req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id } = await params;
  const existing = await prisma.productFavorite.findUnique({
    where: { userId_productId: { userId: user.id, productId: id } },
  });

  if (existing) {
    await prisma.productFavorite.delete({ where: { id: existing.id } });
    return NextResponse.json({ favorited: false });
  }

  await prisma.productFavorite.create({ data: { userId: user.id, productId: id } });
  return NextResponse.json({ favorited: true });
}
