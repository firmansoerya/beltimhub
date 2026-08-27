import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  umkmId: z.string(),
  name: z.string().min(3).max(100),
  description: z.string().min(10),
  price: z.number().int().positive(),
  stock: z.number().int().min(0).default(0),
  images: z.array(z.string()).max(5).default([]),
  category: z.string().min(1),
  weight: z.number().int().positive().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const umkmId = searchParams.get("umkmId");
  const category = searchParams.get("category");
  const q = searchParams.get("q");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(50, Number(searchParams.get("limit") ?? 12));
  const skip = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    status: "ACTIVE",
    ...(umkmId ? { umkmId } : { umkm: { is: { marketplaceStatus: "APPROVED" } } }),
    ...(category ? { category } : {}),
    ...(q ? { OR: [
      { name: { contains: q, mode: "insensitive" as const } },
      { description: { contains: q, mode: "insensitive" as const } },
    ]} : {}),
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        umkm: { select: { id: true, name: true, imageUrl: true, isVerified: true, category: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { umkmId, ...data } = parsed.data;

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true, role: true } });
  if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

  const umkm = await prisma.umkm.findUnique({ where: { id: umkmId }, select: { ownerId: true } });
  if (!umkm) return NextResponse.json({ error: "UMKM tidak ditemukan" }, { status: 404 });
  if (umkm.ownerId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const product = await prisma.product.create({
    data: { ...data, umkmId },
  });

  return NextResponse.json(product, { status: 201 });
}
