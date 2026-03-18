import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// GET /api/umkm/[id]/review — ambil semua ulasan (hanya pemilik UMKM)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id: umkmId } = await params;
  const umkm = await prisma.umkm.findUnique({ where: { id: umkmId }, select: { ownerId: true } });
  if (!umkm) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (umkm.ownerId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const reviews = await prisma.umkmReview.findMany({
    where: { umkmId },
    include: { reviewer: { select: { fullName: true, avatarUrl: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(reviews);
}

const schema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id: umkmId } = await params;
  const umkm = await prisma.umkm.findUnique({ where: { id: umkmId }, select: { ownerId: true } });
  if (!umkm) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (umkm.ownerId === user.id) return NextResponse.json({ error: "Tidak bisa mereview usaha sendiri" }, { status: 400 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const review = await prisma.umkmReview.upsert({
    where: { umkmId_reviewerId: { umkmId, reviewerId: user.id } },
    create: { umkmId, reviewerId: user.id, ...parsed.data },
    update: parsed.data,
    include: { reviewer: { select: { fullName: true, avatarUrl: true } } },
  });

  return NextResponse.json(review);
}

// PATCH /api/umkm/[id]/review?reviewId=xxx — owner membalas ulasan
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id: umkmId } = await params;
  const umkm = await prisma.umkm.findUnique({ where: { id: umkmId }, select: { ownerId: true } });
  if (!umkm) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (umkm.ownerId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const reviewId = req.nextUrl.searchParams.get("reviewId");
  if (!reviewId) return NextResponse.json({ error: "reviewId required" }, { status: 400 });

  const body = await req.json();
  const reply = typeof body.ownerReply === "string" ? body.ownerReply.trim() : null;

  const updated = await prisma.umkmReview.update({
    where: { id: reviewId },
    data: {
      ownerReply: reply || null,
      ownerRepliedAt: reply ? new Date() : null,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id: umkmId } = await params;

  await prisma.umkmReview.deleteMany({
    where: { umkmId, reviewerId: user.id },
  });

  return NextResponse.json({ ok: true });
}
