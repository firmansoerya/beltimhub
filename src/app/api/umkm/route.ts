import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createUmkmSchema = z.object({
  name: z.string().min(3, "Minimal 3 karakter").max(100),
  category: z.string().min(1),
  description: z.string().min(10).max(2000),
  address: z.string().optional(),
  phone: z.string().optional(),
  instagram: z.string().optional(),
  website: z.string().optional(),
  imageUrl: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const q = searchParams.get("q");

  const where = {
    ...(category && category !== "Semua" ? { category } : {}),
    ...(q ? {
      OR: [
        { name: { contains: q, mode: "insensitive" as const } },
        { description: { contains: q, mode: "insensitive" as const } },
      ],
    } : {}),
  };

  const items = await prisma.umkm.findMany({
    where,
    orderBy: [{ isVerified: "desc" }, { createdAt: "desc" }],
    take: 50,
    include: { owner: { select: { id: true, fullName: true } } },
  });

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getOrCreateUser(userId);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json();
  const parsed = createUmkmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const umkm = await prisma.umkm.create({
    data: { ...parsed.data, ownerId: user.id },
  });

  return NextResponse.json(umkm, { status: 201 });
}
