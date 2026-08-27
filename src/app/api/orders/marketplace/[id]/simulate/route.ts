import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Dev-only: simulate pembayaran marketplace order
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  const { id } = await params;

  const order = await prisma.marketplaceOrder.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
  if (order.paymentStatus === "PAID") return NextResponse.json({ error: "Sudah dibayar" }, { status: 409 });
  if (!order.paymentMethod) return NextResponse.json({ error: "Payment belum dibuat" }, { status: 400 });

  const xenditKey = process.env.XENDIT_SECRET_KEY ?? "";
  const authHeader = `Basic ${Buffer.from(xenditKey + ":").toString("base64")}`;

  // Virtual Account: gunakan Xendit simulate
  if (order.paymentMethod.endsWith("_VA") && order.vaNumber) {
    const bankCode = order.paymentMethod.replace("_VA", "");
    const res = await fetch("https://api.xendit.co/callback_virtual_accounts/simulate_payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        transfer_amount: order.totalAmount,
        bank_account_number: order.vaNumber,
        bank_code: bankCode,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn("[marketplace-simulate] Xendit VA simulate gagal, fallback ke direct DB:", err);
      return markAsPaid(id);
    }

    return NextResponse.json({ ok: true, method: "xendit_va" });
  }

  // QRIS & e-wallet: langsung mark PAID di DB
  return markAsPaid(id);
}

async function markAsPaid(orderId: string) {
  await prisma.marketplaceOrder.update({
    where: { id: orderId },
    data: {
      paymentStatus: "PAID",
      orderStatus: "PAID",
      paidAt: new Date(),
    },
  });

  // Kurangi stok produk
  const items = await prisma.orderItem.findMany({ where: { orderId } });
  for (const item of items) {
    await prisma.product.update({
      where: { id: item.productId },
      data: { stock: { decrement: item.quantity } },
    });
  }

  return NextResponse.json({ ok: true, method: "direct_db" });
}
