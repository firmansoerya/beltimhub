import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PaymentRequest } from "xendit-node";

const xenditPayment = new PaymentRequest({
  secretKey: process.env.XENDIT_SECRET_KEY ?? "",
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const { ticketId } = await params;

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return NextResponse.json({ error: "Tiket tidak ditemukan" }, { status: 404 });

  if (ticket.paymentStatus === "PAID") {
    return NextResponse.json({ status: "PAID" });
  }

  if (!ticket.midtransToken) {
    return NextResponse.json({ status: ticket.paymentStatus });
  }

  // Poll status dari Xendit PaymentRequest
  try {
    const result = await xenditPayment.getPaymentRequestByID({
      paymentRequestId: ticket.midtransToken,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const xenditStatus = (result as any)?.status as string | undefined;

    if (xenditStatus === "SUCCEEDED") {
      // Tandai semua tiket dalam order (sama midtransToken) sebagai PAID
      const updated = await prisma.ticket.updateMany({
        where: { midtransToken: ticket.midtransToken },
        data: { paymentStatus: "PAID", paidAt: new Date() },
      });
      await prisma.event.update({
        where: { id: ticket.eventId },
        data: { registeredCount: { increment: updated.count } },
      });
      const orderTickets = await prisma.ticket.findMany({
        where: { midtransToken: ticket.midtransToken },
        select: { id: true },
      });
      const { generateAndSendTicket } = await import("@/lib/ticket-service");
      orderTickets.forEach(t => generateAndSendTicket(t.id).catch(console.error));
      return NextResponse.json({ status: "PAID" });
    }

    if (xenditStatus === "FAILED" || xenditStatus === "VOIDED") {
      await prisma.ticket.updateMany({
        where: { midtransToken: ticket.midtransToken },
        data: { paymentStatus: "FAILED" },
      });
      return NextResponse.json({ status: "FAILED" });
    }

    // VA expiry check
    if (ticket.vaExpiry && new Date() > ticket.vaExpiry) {
      await prisma.ticket.updateMany({
        where: { midtransToken: ticket.midtransToken },
        data: { paymentStatus: "EXPIRED" },
      });
      return NextResponse.json({ status: "EXPIRED" });
    }

    return NextResponse.json({ status: "PENDING" });
  } catch {
    return NextResponse.json({ status: ticket.paymentStatus });
  }
}
