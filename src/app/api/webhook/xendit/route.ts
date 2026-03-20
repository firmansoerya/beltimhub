import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyXenditWebhook } from "@/lib/xendit";
import { generateAndSendTicket } from "@/lib/ticket-service";

export async function POST(req: NextRequest) {
  const callbackToken = req.headers.get("x-callback-token") ?? "";
  const expectedToken = process.env.XENDIT_WEBHOOK_TOKEN ?? "";

  console.log("[xendit-webhook] hit! token match:", callbackToken === expectedToken, "| callbackToken:", callbackToken.slice(0, 8) + "...", "| expectedToken:", expectedToken.slice(0, 8) + "...");

  if (!verifyXenditWebhook(callbackToken, expectedToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { external_id, status, paid_at } = body;

  console.log("[xendit-webhook] received:", { external_id, status });

  if (!external_id) {
    return NextResponse.json({ error: "Missing external_id" }, { status: 400 });
  }

  // Cek apakah ini order marketplace (prefix ORDER-)
  if (external_id.startsWith("ORDER-")) {
    const order = await prisma.marketplaceOrder.findUnique({
      where: { xenditRefId: external_id },
    });

    console.log("[xendit-webhook] marketplace order found:", order?.id, "status:", order?.orderStatus);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (status === "PAID" || status === "SETTLED") {
      await prisma.marketplaceOrder.update({
        where: { id: order.id },
        data: {
          paymentStatus: "PAID",
          orderStatus: "PAID",
          paidAt: paid_at ? new Date(paid_at) : new Date(),
        },
      });
      console.log("[xendit-webhook] marketplace order updated to PAID:", order.id);
    } else if (status === "EXPIRED") {
      await prisma.marketplaceOrder.update({
        where: { id: order.id },
        data: { paymentStatus: "EXPIRED", orderStatus: "CANCELLED" },
      });
    }

    return NextResponse.json({ received: true });
  }

  // Default: tiket event
  const ticket = await prisma.ticket.findUnique({
    where: { id: external_id },
    include: { event: true, user: true },
  });

  console.log("[xendit-webhook] ticket found:", ticket?.id, "status:", ticket?.paymentStatus);

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  if (status === "PAID" || status === "SETTLED") {
    await prisma.$transaction([
      prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          paymentStatus: "PAID",
          paidAt: paid_at ? new Date(paid_at) : new Date(),
        },
      }),
      prisma.event.update({
        where: { id: ticket.eventId },
        data: { registeredCount: { increment: 1 } },
      }),
    ]);
    console.log("[xendit-webhook] ticket updated to PAID:", ticket.id);

    await generateAndSendTicket(ticket.id).catch(console.error);
  } else if (status === "EXPIRED") {
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { paymentStatus: "EXPIRED" },
    });
  }

  return NextResponse.json({ received: true });
}
