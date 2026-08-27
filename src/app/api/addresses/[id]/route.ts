import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  label: z.string().min(1).max(50).optional(),
  recipient: z.string().min(2).max(100).optional(),
  phone: z.string().min(8).max(20).optional(),
  address: z.string().min(10).max(500).optional(),
  district: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  province: z.string().max(100).optional(),
  postalCode: z.string().max(10).optional(),
  isDefault: z.boolean().optional(),
});

async function getUser() {
  const { userId } = await auth();
  if (!userId) return null;
  return prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
}

// PUT — update address
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.shippingAddress.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { isDefault, ...data } = parsed.data;

  if (isDefault) {
    await prisma.shippingAddress.updateMany({
      where: { userId: user.id, isDefault: true },
      data: { isDefault: false },
    });
  }

  const address = await prisma.shippingAddress.update({
    where: { id },
    data: { ...data, ...(isDefault !== undefined ? { isDefault } : {}) },
  });

  return NextResponse.json(address);
}

// DELETE — delete address
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.shippingAddress.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.shippingAddress.delete({ where: { id } });

  // If deleted was default, set another as default
  if (existing.isDefault) {
    const next = await prisma.shippingAddress.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });
    if (next) {
      await prisma.shippingAddress.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  }

  return NextResponse.json({ ok: true });
}
