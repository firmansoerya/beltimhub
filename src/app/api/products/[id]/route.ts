import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().min(10).optional(),
  price: z.number().int().positive().optional(),
  stock: z.number().int().min(0).optional(),
  images: z.array(z.string()).max(5).optional(),
  category: z.string().min(1).optional(),
  weight: z.number().int().positive().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      umkm: { select: { id: true, name: true, imageUrl: true, isVerified: true, category: true, phone: true, instagram: true } },
    },
  });
  if (!product) return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
  return NextResponse.json(product);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [user, product] = await Promise.all([
    prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true, role: true } }),
    prisma.product.findUnique({ where: { id }, include: { umkm: { select: { ownerId: true } } } }),
  ]);

  if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
  if (!product) return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
  if (product.umkm.ownerId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const updated = await prisma.product.update({ where: { id }, data: parsed.data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [user, product] = await Promise.all([
    prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true, role: true } }),
    prisma.product.findUnique({ where: { id }, include: { umkm: { select: { ownerId: true } } } }),
  ]);

  if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
  if (!product) return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
  if (product.umkm.ownerId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  await prisma.product.update({ where: { id }, data: { status: "DELETED" } });
  return NextResponse.json({ success: true });
}
