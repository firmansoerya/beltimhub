import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ticketCode, eventId } = await req.json();
  if (!ticketCode || !eventId) {
    return NextResponse.json({ error: "ticketCode dan eventId wajib diisi" }, { status: 400 });
  }

  const ticket = await prisma.ticket.findFirst({
    where: { ticketCode: ticketCode.trim().toUpperCase(), eventId },
    include: { event: { select: { title: true, organizerId: true } } },
  });

  if (!ticket) return NextResponse.json({ error: "Tiket tidak ditemukan" }, { status: 404 });

  if (user.role !== "ADMIN" && ticket.event.organizerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (ticket.paymentStatus !== "PAID") {
    return NextResponse.json({ valid: false, reason: "Pembayaran belum selesai" });
  }

  if (ticket.checkedInAt) {
    return NextResponse.json({
      valid: false,
      reason: "Tiket sudah digunakan",
      checkedInAt: ticket.checkedInAt,
    });
  }

  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: { checkedInAt: new Date() },
  });

  return NextResponse.json({
    valid: true,
    participantName: ticket.participantName,
    jerseySize: ticket.jerseySize,
    bibNumber: ticket.bibNumber,
    checkedInAt: updated.checkedInAt,
  });
}
