import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { sendWhatsApp, sendWhatsAppDocument } from "@/lib/whatsapp";
import { generateInvoicePdf } from "@/lib/generate-invoice-pdf";
import { generateEvoucherPdf } from "@/lib/generate-evoucher-pdf";
import { getSiteSettings } from "@/lib/site-settings";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function generateAndSendTicket(ticketId: string): Promise<void> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      event: true,
      ticketCategory: { select: { name: true } },
      user: true,
    },
  });

  if (!ticket || ticket.paymentStatus !== "PAID") return;

  // Generate QR Code data URL
  const qrPayload = JSON.stringify({
    ticketId: ticket.id,
    ticketCode: ticket.ticketCode,
    eventId: ticket.eventId,
    verifyUrl: `${APP_URL}/api/tickets/${ticket.id}/verify`,
  });

  const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
    errorCorrectionLevel: "H",
    width: 400,
    margin: 2,
  });

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { qrCodeData: qrCodeDataUrl },
  });

  // ── Setelah generate QR, cek apakah semua tiket dalam order sudah PAID ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderId = (ticket as any).orderId as string | null | undefined;
  if (orderId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderWhere = { orderId } as any;
    const [totalInOrder, paidInOrder, primaryTicket] = await Promise.all([
      prisma.ticket.count({ where: orderWhere }),
      prisma.ticket.count({ where: { ...orderWhere, paymentStatus: "PAID" } }),
      // Hanya tiket pertama dalam order yang boleh trigger order confirmation
      prisma.ticket.findFirst({ where: orderWhere, orderBy: { createdAt: "asc" }, select: { id: true } }),
    ]);
    if (paidInOrder >= totalInOrder && primaryTicket?.id === ticketId) {
      sendOrderConfirmation(orderId).catch(console.error);
    }
  } else {
    // Tiket tanpa orderId (legacy / single ticket) — kirim order-level docs langsung
    sendOrderConfirmationForTickets([ticketId]).catch(console.error);
  }
}

/**
 * Kirim e-voucher PDF + invoice PDF (order-level) untuk satu orderId.
 * Dipanggil setelah semua tiket dalam order sudah PAID.
 */
export async function sendOrderConfirmation(orderId: string): Promise<void> {
  const tickets = await prisma.ticket.findMany({
    where: { orderId, paymentStatus: "PAID" },
    include: {
      event: true,
      ticketCategory: { select: { name: true } },
      user: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (tickets.length === 0) return;

  await sendOrderConfirmationForTickets(tickets.map(t => t.id));
}

/**
 * Kirim e-voucher PDF + invoice PDF untuk sekumpulan ticketId.
 * Bisa dipanggil langsung (e.g. dari API send-confirmation) atau dari sendOrderConfirmation.
 */
export async function sendOrderConfirmationForTickets(ticketIds: string[]): Promise<void> {
  if (ticketIds.length === 0) return;

  const tickets = await prisma.ticket.findMany({
    where: { id: { in: ticketIds }, paymentStatus: "PAID" },
    include: {
      event: true,
      ticketCategory: { select: { name: true } },
      user: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (tickets.length === 0) return;

  const first = tickets[0];
  const { event } = first;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ft = first as any;

  const phone: string | null = ft.ordererPhone ?? first.participantPhone ?? first.user?.phoneNumber ?? null;
  if (!phone) return;

  // Derive orderId for document naming (use first 8 chars of orderId or ticketCode)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderId = (first as any).orderId as string | null | undefined ?? first.ticketCode;
  const ordererName: string = ft.ordererName ?? first.user?.fullName ?? first.participantName;

  // ── Pesan teks konfirmasi (1x ke pemesan) ────────────────────────────────
  const eventDate = event.eventDate.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const eventTime = event.eventDate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const ticketLines = tickets.map((t, i) =>
    `${i + 1}. ${t.participantName}${t.ticketCategory?.name ? ` (${t.ticketCategory.name})` : ""} — *${t.ticketCode}*`
  ).join("\n");
  const textMessage = `Halo *${ordererName}*,\n\nPembayaran tiket Anda telah dikonfirmasi!\n\n*${event.title}*\nTanggal : ${eventDate}\nWaktu   : ${eventTime} WIB\nLokasi  : ${event.location}\n\n*Daftar Tiket:*\n${ticketLines}\n\nE-voucher & invoice dikirim sebagai lampiran PDF berikut.\n\n_Beltim.id — Hub Digital Belitung Timur_`;
  await sendWhatsApp(phone, textMessage).catch(console.error);
  const purchaseDate = first.paidAt ?? first.createdAt;

  const ticketRows = tickets.map(t => ({
    participantName: t.participantName,
    categoryName: t.ticketCategory?.name ?? null,
    amount: t.amount,
    platformFee: t.platformFee,
    ticketCode: t.ticketCode,
    qrCodeDataUrl: t.qrCodeData ?? null,
  }));

  const brand = await getSiteSettings().catch(() => null);

  // Fetch event banner as base64 if available
  let eventBannerBase64: string | null = null;
  if (event.coverImage) {
    try {
      const res = await fetch(event.coverImage);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        eventBannerBase64 = buf.toString("base64");
      }
    } catch {
      // fallback to placeholder
    }
  }

  // ── E-Voucher PDF (order-level) ────────────────────────────────────────────
  const evoucherPdf = await generateEvoucherPdf({
    orderId,
    purchaseDate,
    ordererName,
    eventTitle: event.title,
    eventDate: event.eventDate,
    eventLocation: event.location,
    eventBannerBase64,
    tickets: ticketRows,
    brand: brand ?? undefined,
  }).catch((err) => { console.error("[evoucher] generate failed:", err); return null; });

  if (evoucherPdf) {
    const orderCode = orderId.replace(/-/g, "").slice(0, 8).toUpperCase();
    await sendWhatsAppDocument(
      phone,
      evoucherPdf.toString("base64"),
      `evoucher-${orderCode}.pdf`,
      "Konfirmasi pemesanan Anda — tunjukkan saat check-in"
    );
  }

  // ── Invoice PDF (order-level) ──────────────────────────────────────────────
  const invoicePdf = await generateInvoicePdf({
    orderId,
    purchaseDate,
    ordererName,
    ordererPhone: ft.ordererPhone ?? first.participantPhone,
    ordererEmail: ft.ordererEmail ?? first.participantEmail,
    eventTitle: event.title,
    eventDate: event.eventDate,
    eventLocation: event.location,
    tickets: ticketRows,
    paymentMethod: first.paymentMethod,
    paymentStatus: first.paymentStatus,
    brand: brand ?? undefined,
  }).catch(() => null);

  if (invoicePdf) {
    const orderCode = orderId.replace(/-/g, "").slice(0, 8).toUpperCase();
    await sendWhatsAppDocument(
      phone,
      invoicePdf.toString("base64"),
      `invoice-${orderCode}.pdf`,
      "Invoice pemesanan tiket Anda"
    ).catch(console.error);
  }
}

