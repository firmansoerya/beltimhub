import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ticketIds, toEmail } = await req.json();
  if (!Array.isArray(ticketIds) || ticketIds.length === 0 || !toEmail) {
    return NextResponse.json({ error: "Data tidak lengkap." }, { status: 400 });
  }

  const fromUser = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true, email: true },
  });
  if (!fromUser) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });

  if (fromUser.email?.toLowerCase() === toEmail.toLowerCase()) {
    return NextResponse.json({ error: "Tidak bisa transfer ke diri sendiri." }, { status: 400 });
  }

  const toUser = await prisma.user.findFirst({
    where: { email: { equals: toEmail, mode: "insensitive" } },
    select: { id: true },
  });
  if (!toUser) {
    return NextResponse.json({ error: "Email tidak terdaftar di BeltimHub." }, { status: 404 });
  }

  // Pastikan tiket milik sender dan sudah PAID
  const tickets = await prisma.ticket.findMany({
    where: { id: { in: ticketIds }, userId: fromUser.id, paymentStatus: "PAID" },
    select: { id: true },
  });
  if (tickets.length !== ticketIds.length) {
    return NextResponse.json({ error: "Beberapa tiket tidak valid atau bukan milikmu." }, { status: 400 });
  }

  // Pastikan tidak ada transfer PENDING yang sudah ada
  const existing = await prisma.ticketTransfer.findFirst({
    where: { ticketId: { in: ticketIds }, status: "PENDING" },
  });
  if (existing) {
    return NextResponse.json({ error: "Beberapa tiket sudah dalam proses transfer." }, { status: 400 });
  }

  await prisma.ticketTransfer.createMany({
    data: ticketIds.map((ticketId: string) => ({
      ticketId,
      fromUserId: fromUser.id,
      toEmail: toEmail.toLowerCase(),
      toUserId: toUser.id,
    })),
  });

  return NextResponse.json({ success: true });
}
