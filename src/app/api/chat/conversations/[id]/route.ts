import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// GET — ambil pesan dalam conversation
export async function GET(_req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id } = await params;
  const conv = await prisma.conversation.findUnique({
    where: { id },
    include: {
      buyer:  { select: { id: true, fullName: true, avatarUrl: true } },
      seller: { select: { id: true, fullName: true, avatarUrl: true } },
      umkm:   { select: { id: true, name: true, imageUrl: true } },
      messages: {
        include: { sender: { select: { id: true, fullName: true, avatarUrl: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (conv.buyerId !== user.id && conv.sellerId !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Tandai pesan masuk sebagai sudah dibaca
  await prisma.message.updateMany({
    where: { conversationId: id, senderId: { not: user.id }, isRead: false },
    data: { isRead: true },
  });

  return NextResponse.json({ conversation: conv, currentUserId: user.id });
}

// DELETE — hapus conversation beserta semua pesan
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id } = await params;
  const conv = await prisma.conversation.findUnique({ where: { id }, select: { buyerId: true, sellerId: true } });
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (conv.buyerId !== user.id && conv.sellerId !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Messages cascade delete karena onDelete: Cascade di schema
  await prisma.conversation.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

// POST — kirim pesan baru
export async function POST(req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id } = await params;
  const conv = await prisma.conversation.findUnique({ where: { id }, select: { buyerId: true, sellerId: true } });
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (conv.buyerId !== user.id && conv.sellerId !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Pesan tidak boleh kosong" }, { status: 400 });

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: { conversationId: id, senderId: user.id, content: content.trim() },
      include: { sender: { select: { id: true, fullName: true, avatarUrl: true } } },
    }),
    prisma.conversation.update({ where: { id }, data: { updatedAt: new Date() } }),
  ]);

  return NextResponse.json({ message }, { status: 201 });
}
