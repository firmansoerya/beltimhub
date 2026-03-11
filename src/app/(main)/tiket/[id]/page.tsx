import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Calendar, MapPin, Clock, User } from "lucide-react";
import { PaymentPoller } from "./PaymentPoller";
import { DownloadTicketButton } from "./TicketActions";
import { format } from "date-fns";
import { id } from "date-fns/locale";

async function syncXenditStatus(ticketId: string) {
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket || ticket.paymentStatus === "PAID" || !ticket.midtransToken) return;
    const { Invoice } = await import("@/lib/xendit");
    const invoice = await Invoice.getInvoiceById({ invoiceId: ticket.midtransToken });
    const status = (invoice as { status?: string }).status;
    if (status === "PAID" || status === "SETTLED") {
      await prisma.$transaction([
        prisma.ticket.update({
          where: { id: ticketId },
          data: { paymentStatus: "PAID", paidAt: new Date() },
        }),
        prisma.event.update({
          where: { id: ticket.eventId },
          data: { registeredCount: { increment: 1 } },
        }),
      ]);
      const { generateAndSendTicket } = await import("@/lib/ticket-service");
      await generateAndSendTicket(ticketId).catch(console.error);
    }
  } catch {
    // silent — jangan gagalkan render halaman
  }
}

export default async function TiketPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { id: ticketId } = await params;
  const { status: queryStatus } = await searchParams;

  // Jika redirect dari Xendit dengan status=success, sync status dari API Xendit
  if (queryStatus === "success") {
    await syncXenditStatus(ticketId);
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { event: true },
  });

  if (!ticket) notFound();

  const isPaid = ticket.paymentStatus === "PAID";
  const isFreeTicket = ticket.amount === 0;

  return (
    <div className="container mx-auto max-w-md px-4 py-8">
      <div className="text-center mb-6">
        {isPaid ? (
          <>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <h1 className="text-xl font-bold text-green-600">
              {isFreeTicket ? "Pendaftaran Berhasil" : "Tiket Valid"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isFreeTicket ? "Kamu sudah terdaftar di event ini" : "Pembayaran berhasil"}
            </p>
          </>
        ) : (
          <>
            <Clock className="h-12 w-12 text-amber-500 mx-auto mb-2" />
            <h1 className="text-xl font-bold text-amber-600">Menunggu Pembayaran</h1>
            <p className="text-sm text-muted-foreground">
              Selesaikan pembayaran untuk mendapatkan tiket
            </p>
            <PaymentPoller ticketId={ticketId} />
          </>
        )}
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          {/* QR Code */}
          {isPaid && ticket.qrCodeData && (
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ticket.qrCodeData}
                alt="QR Code Tiket"
                className="w-48 h-48"
              />
              <DownloadTicketButton
                data={{
                  qrCodeData: ticket.qrCodeData,
                  ticketCode: ticket.ticketCode,
                  participantName: ticket.participantName,
                  eventTitle: ticket.event.title,
                  eventDate: format(new Date(ticket.event.eventDate), "EEEE, d MMMM yyyy", { locale: id }),
                  eventTime: format(new Date(ticket.event.eventDate), "HH:mm"),
                  eventLocation: ticket.event.location,
                  jerseySize: ticket.jerseySize,
                  bibNumber: ticket.bibNumber,
                  participantPhone: ticket.participantPhone,
                  participantEmail: ticket.participantEmail,
                }}
              />
            </div>
          )}

          <div className="text-center">
            <Badge variant="outline" className="font-mono text-sm">
              {ticket.ticketCode}
            </Badge>
          </div>

          <Separator />

          <div className="space-y-3">
            <h2 className="font-semibold text-sm">{ticket.event.title}</h2>

            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {format(new Date(ticket.event.eventDate), "EEEE, d MMMM yyyy", {
                  locale: id,
                })}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {format(new Date(ticket.event.eventDate), "HH:mm 'WIB'")}
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {ticket.event.location}
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{ticket.participantName}</span>
            </div>
            {ticket.jerseySize && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Jersey:</span>
                <Badge variant="secondary">{ticket.jerseySize}</Badge>
              </div>
            )}
            {ticket.bibNumber && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>BIB:</span>
                <Badge variant="secondary">#{ticket.bibNumber}</Badge>
              </div>
            )}
          </div>

          {ticket.checkedInAt && (
            <>
              <Separator />
              <div className="text-center">
                <Badge className="bg-green-500">
                  ✓ Check-in:{" "}
                  {format(new Date(ticket.checkedInAt), "HH:mm, d MMM yyyy")}
                </Badge>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
