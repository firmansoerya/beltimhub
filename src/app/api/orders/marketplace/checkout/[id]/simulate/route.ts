import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Dev-only: simulate pembayaran checkout session
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  const { id } = await params;

  const session = await prisma.checkoutSession.findUnique({
    where: { id },
    include: { orders: { include: { items: true } } },
  });

  if (!session) return NextResponse.json({ error: "Session tidak ditemukan" }, { status: 404 });
  if (session.status === "PAID") return NextResponse.json({ error: "Sudah dibayar" }, { status: 409 });

  const xenditKey = process.env.XENDIT_SECRET_KEY ?? "";
  const authHeader = `Basic ${Buffer.from(xenditKey + ":").toString("base64")}`;

  // Virtual Account: gunakan Xendit simulate
  if (session.paymentMethod?.endsWith("_VA") && session.vaNumber) {
    const bankCode = session.paymentMethod.replace("_VA", "");
    const res = await fetch("https://api.xendit.co/callback_virtual_accounts/simulate_payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        transfer_amount: session.totalAmount,
        bank_account_number: session.vaNumber,
        bank_code: bankCode,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn("[checkout-simulate] Xendit VA simulate gagal, fallback ke direct DB:", err);
      return markSessionPaid(session);
    }

    return NextResponse.json({ ok: true, method: "xendit_va" });
  }

  // QRIS & e-wallet: langsung mark PAID di DB
  return markSessionPaid(session);
}

async function markSessionPaid(session: {
  id: string;
  orders: { id: string; items: { productId: string; quantity: number }[] }[];
}) {
  const now = new Date();

  // Update checkout session
  await prisma.checkoutSession.update({
    where: { id: session.id },
    data: { status: "PAID", paidAt: now },
  });

  // Update semua orders dalam session
  for (const order of session.orders) {
    await prisma.marketplaceOrder.update({
      where: { id: order.id },
      data: { paymentStatus: "PAID", orderStatus: "PAID", paidAt: now },
    });

    // Kurangi stok produk
    for (const item of order.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }
  }

  return NextResponse.json({ ok: true, method: "direct_db" });
}
