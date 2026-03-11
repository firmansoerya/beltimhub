import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { sendWhatsApp } from "@/lib/whatsapp";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function generateAndSendTicket(ticketId: string): Promise<void> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      event: true,
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

  // Send WhatsApp notification if phone available
  const phone = ticket.participantPhone ?? ticket.user?.phoneNumber;
  if (phone) {
    const { event } = ticket;
    const message = formatTicketMessage({
      participantName: ticket.participantName,
      eventTitle: event.title,
      eventDate: event.eventDate.toLocaleDateString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      eventTime: event.eventDate.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      location: event.location,
      ticketCode: ticket.ticketCode,
      ticketUrl: `${APP_URL}/tiket/${ticket.id}`,
    });

    await sendWhatsApp(phone, message).catch(console.error);
  }
}

function formatTicketMessage({
  participantName,
  eventTitle,
  eventDate,
  eventTime,
  location,
  ticketCode,
  ticketUrl,
}: {
  participantName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  location: string;
  ticketCode: string;
  ticketUrl: string;
}): string {
  return `✅ *Pendaftaran Berhasil!*

Halo ${participantName}! 🎉

Berikut detail tiket Anda:

🎪 *${eventTitle}*
📅 ${eventDate}
⏰ ${eventTime} WIB
📍 ${location}

🎫 Kode Tiket: *${ticketCode}*

Tunjukkan QR Code berikut saat check-in di lokasi:
${ticketUrl}

Jangan lupa hadir tepat waktu ya! Sampai jumpa 👋

_Beltim.id — Hub Digital Belitung Timur_`;
}
