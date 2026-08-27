import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const updateSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  category: z.string().optional(),
  description: z.string().min(10).optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  mapsUrl: z.string().url().optional().or(z.literal("")),
  gallery: z.array(z.string()).max(20).optional(),
  phone: z.string().optional(),
  instagram: z.string().optional(),
  website: z.string().optional(),
  imageUrl: z.string().optional(),
  shippingMethods: z.array(z.string()).optional(),
  shippingConfig: z.record(z.string(), z.object({
    enabled: z.boolean(),
    fee: z.number().int().min(0),
    freeMinimum: z.number().int().min(0),
  })).optional(),
  operatingHours: z.string().optional(),
  replyTime: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id } = await params;
  const umkm = await prisma.umkm.findUnique({ where: { id }, select: { ownerId: true } });
  if (!umkm) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (umkm.ownerId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data: Prisma.UmkmUpdateInput = {
    ...parsed.data,
    ...(parsed.data.shippingConfig && {
      shippingConfig: parsed.data.shippingConfig as Prisma.InputJsonValue,
    }),
  };
  const updated = await prisma.umkm.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id } = await params;
  const umkm = await prisma.umkm.findUnique({ where: { id }, select: { ownerId: true } });
  if (!umkm) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (umkm.ownerId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.umkm.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
