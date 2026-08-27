import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// GET /api/chat/conversations — list semua conversation user
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ buyerId: user.id }, { sellerId: user.id }] },
    include: {
      buyer:  { select: { id: true, fullName: true, avatarUrl: true } },
      seller: { select: { id: true, fullName: true, avatarUrl: true } },
      umkm:   { select: { id: true, name: true, imageUrl: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Hitung unread per conversation
  const withUnread = await Promise.all(conversations.map(async (c) => {
    const unread = await prisma.message.count({
      where: { conversationId: c.id, senderId: { not: user.id }, isRead: false },
    });
    return { ...c, unreadCount: unread };
  }));

  return NextResponse.json({ conversations: withUnread, currentUserId: user.id });
}

// POST /api/chat/conversations — buat atau ambil conversation yang sudah ada
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { umkmId } = await req.json();
  if (!umkmId) return NextResponse.json({ error: "umkmId required" }, { status: 400 });

  const umkm = await prisma.umkm.findUnique({ where: { id: umkmId }, select: { ownerId: true } });
  if (!umkm) return NextResponse.json({ error: "UMKM not found" }, { status: 404 });

  if (umkm.ownerId === user.id)
    return NextResponse.json({ error: "Tidak bisa chat dengan toko sendiri" }, { status: 400 });

  // Cari atau buat conversation
  const existing = await prisma.conversation.findUnique({
    where: { buyerId_sellerId_umkmId: { buyerId: user.id, sellerId: umkm.ownerId, umkmId } },
  });
  if (existing) return NextResponse.json({ conversationId: existing.id });

  const created = await prisma.conversation.create({
    data: { buyerId: user.id, sellerId: umkm.ownerId, umkmId },
  });
  return NextResponse.json({ conversationId: created.id }, { status: 201 });
}
