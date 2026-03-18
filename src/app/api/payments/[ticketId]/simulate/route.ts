import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Dev-only: simulate pembayaran
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  const { ticketId } = await params;

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return NextResponse.json({ error: "Tiket tidak ditemukan" }, { status: 404 });
  if (ticket.paymentStatus === "PAID") return NextResponse.json({ error: "Sudah dibayar" }, { status: 409 });
  if (!ticket.paymentMethod) return NextResponse.json({ error: "Payment belum dibuat" }, { status: 400 });

  const xenditKey = process.env.XENDIT_SECRET_KEY ?? "";
  const authHeader = `Basic ${Buffer.from(xenditKey + ":").toString("base64")}`;

  // Virtual Account: gunakan Xendit simulate dengan VA number
  if (ticket.paymentMethod.endsWith("_VA") && ticket.vaNumber) {
    const bankCode = ticket.paymentMethod.replace("_VA", "");
    const res = await fetch("https://api.xendit.co/callback_virtual_accounts/simulate_payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        transfer_amount: ticket.amount,
        bank_account_number: ticket.vaNumber,
        bank_code: bankCode,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      // Fallback: langsung mark PAID jika Xendit simulate gagal
      console.warn("[simulate] Xendit VA simulate gagal, fallback ke direct DB:", err);
      return markAsPaid(ticketId, ticket.eventId);
    }

    return NextResponse.json({ ok: true, method: "xendit_va" });
  }

  // QRIS & lainnya: langsung mark PAID di DB (Xendit tidak punya simulate endpoint untuk QRIS via Payment Request)
  return markAsPaid(ticketId, ticket.eventId);
}

async function markAsPaid(ticketId: string, eventId: string) {
  // Tandai semua tiket dalam order (sama midtransToken)
  const t = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { midtransToken: true } });
  const where = t?.midtransToken ? { midtransToken: t.midtransToken } : { id: ticketId };

  const updated = await prisma.ticket.updateMany({ where, data: { paymentStatus: "PAID", paidAt: new Date() } });
  await prisma.event.update({ where: { id: eventId }, data: { registeredCount: { increment: updated.count } } });

  const tickets = await prisma.ticket.findMany({ where, select: { id: true } });
  const { generateAndSendTicket } = await import("@/lib/ticket-service");
  tickets.forEach(t => generateAndSendTicket(t.id).catch(console.error));

  return NextResponse.json({ ok: true, method: "direct_db" });
}
