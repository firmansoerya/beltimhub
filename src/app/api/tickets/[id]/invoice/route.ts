import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInvoicePdf } from "@/lib/generate-invoice-pdf";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      event: { select: { title: true, eventDate: true, location: true } },
      ticketCategory: { select: { name: true } },
      user: { select: { fullName: true } },
    },
  });

  if (!ticket || ticket.paymentStatus !== "PAID") {
    return NextResponse.json({ error: "Tiket tidak ditemukan" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = ticket as any;

  // If ticket belongs to an order, fetch all tickets in the same order
  const orderId: string | null = t.orderId ?? null;
  let orderTickets: typeof ticket[] = [ticket];

  if (orderId) {
    const siblings = await prisma.ticket.findMany({
      where: { orderId, paymentStatus: "PAID" },
      include: {
        event: { select: { title: true, eventDate: true, location: true } },
        ticketCategory: { select: { name: true } },
        user: { select: { fullName: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    if (siblings.length > 0) orderTickets = siblings;
  }

  const first = orderTickets[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ft = first as any;
  const effectiveOrderId = orderId ?? first.ticketCode;
  const ordererName: string = ft.ordererName ?? first.user?.fullName ?? first.participantName;

  const pdf = await generateInvoicePdf({
    orderId: effectiveOrderId,
    purchaseDate: first.paidAt ?? first.createdAt,
    ordererName,
    ordererPhone: ft.ordererPhone ?? first.participantPhone,
    ordererEmail: ft.ordererEmail ?? first.participantEmail,
    eventTitle: first.event.title,
    eventDate: first.event.eventDate,
    eventLocation: first.event.location,
    tickets: orderTickets.map(tk => ({
      participantName: tk.participantName,
      categoryName: tk.ticketCategory?.name ?? null,
      amount: tk.amount,
      platformFee: tk.platformFee,
    })),
    paymentMethod: first.paymentMethod,
    paymentStatus: first.paymentStatus,
  });

  const orderCode = effectiveOrderId.replace(/-/g, "").slice(0, 8).toUpperCase();
  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${orderCode}.pdf"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
