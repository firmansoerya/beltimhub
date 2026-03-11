import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// QR Scan check-in endpoint
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: ticketId } = await params;

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { event: { select: { title: true, organizerId: true } } },
  });

  if (!ticket) return NextResponse.json({ error: "Tiket tidak ditemukan" }, { status: 404 });

  // Verify user is organizer of this event
  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (
    !user ||
    (user.role !== "ADMIN" && ticket.event.organizerId !== user.id)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (ticket.paymentStatus !== "PAID") {
    return NextResponse.json(
      { valid: false, reason: "Pembayaran belum selesai" },
      { status: 200 }
    );
  }

  if (ticket.checkedInAt) {
    return NextResponse.json(
      {
        valid: false,
        reason: "Tiket sudah digunakan",
        checkedInAt: ticket.checkedInAt,
      },
      { status: 200 }
    );
  }

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
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
