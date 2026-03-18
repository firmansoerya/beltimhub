import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, MapPin, Clock, CheckCircle2, QrCode, Info, Clock3 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { ShareButton } from "@/components/ShareButton";
import { DownloadTicketButton } from "@/app/(main)/tiket/[id]/TicketActions";
import { TransferButton } from "./TransferButton";

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ section?: string }>;
}) {
  const [{ userId }, { key }, { section }] = await Promise.all([auth(), params, searchParams]);
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
  if (!user) redirect("/sign-in");

  const tickets = await prisma.ticket.findMany({
    where: { userId: user.id, OR: [{ orderId: key }, { id: key }] },
    include: {
      event: {
        select: {
          id: true, title: true, eventDate: true, endDate: true,
          location: true, address: true, coverImage: true,
          description: true, category: true,
          organizer: { select: { fullName: true, avatarUrl: true, organizerLogoUrl: true } },
        },
      },
      ticketCategory: { select: { name: true } },
      transfers: {
        where: { status: "PENDING" },
        select: { id: true, toEmail: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (tickets.length === 0) notFound();

  const event = tickets[0].event;
  const paymentStatus = tickets[0].paymentStatus;
  const isPaid = paymentStatus === "PAID";

  const eventDate = new Date(event.eventDate);
  const endDate = event.endDate ? new Date(event.endDate) : null;
  const timeStr = format(eventDate, "HH:mm");
  const timeDisplay = endDate ? `${timeStr} – ${format(endDate, "HH:mm")} WIB` : `${timeStr} WIB`;

  const activeSection = section ?? "tiket";

  const tabs = [
    { id: "tiket", label: "Tiket" },
    { id: "info", label: "Info Event" },
    { id: "lokasi", label: "Lokasi" },
  ];

  return (
    <div className="pb-12">
      {/* Sticky back nav */}
      <div className="sticky top-0 z-20 bg-background -mx-6 md:-mx-8 px-6 md:px-8 py-3 border-b flex items-center gap-2">
        <Link href="/dashboard/tiket" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-sm text-muted-foreground">Tiket Saya</span>
        <span className="text-muted-foreground/40 text-sm">/</span>
        <span className="text-sm font-medium line-clamp-1">{event.title}</span>
      </div>

      {/* Event header – compact Ticketmaster-style */}
      <div className="mt-5 flex gap-3 items-start">
        {/* Thumbnail */}
        <div className="shrink-0 h-16 w-16 rounded-lg overflow-hidden bg-muted border">
          {event.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.coverImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-lg">{event.title.charAt(0)}</span>
            </div>
          )}
        </div>

        {/* Date card */}
        <div className="shrink-0 border rounded-lg text-center px-3 py-2 min-w-[52px]">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            {format(eventDate, "MMM", { locale: id })}
          </p>
          <p className="text-2xl font-bold leading-tight">{format(eventDate, "d")}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">
            {format(eventDate, "EEE", { locale: id })}
          </p>
        </div>

        {/* Title + meta + share */}
        <div className="flex-1 min-w-0">
          {event.category && (
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">
              {event.category}
            </p>
          )}
          <h1 className="text-base font-bold leading-snug line-clamp-2">{event.title}</h1>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <Clock className="h-3 w-3 shrink-0" />
            {timeDisplay}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3 shrink-0" />
            {event.location}
          </p>

          {/* Inline share label */}
          <div className="mt-2">
            <p className="text-[10px] text-muted-foreground mb-1">Bagikan kehadiran kamu</p>
            <ShareButton
              title={event.title}
              text={`Saya akan hadir di ${event.title}!`}
              url={`${process.env.NEXT_PUBLIC_APP_URL}/event/${event.id}`}
              inline
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="-mx-6 md:-mx-8 px-6 md:px-8 mt-5 border-b flex gap-0">
        {tabs.map(tab => (
          <Link
            key={tab.id}
            href={`/dashboard/tiket/order/${key}?section=${tab.id}`}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeSection === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Tab: Tiket */}
      {activeSection === "tiket" && (
        <div className="mt-5">
          {/* Header row */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-bold text-base">Tiket Saya</h2>
              <p className="text-sm text-muted-foreground">×{tickets.length} Mobile Tiket</p>
            </div>
            {isPaid && (
              <TransferButton
                eventTitle={event.title}
                tickets={tickets.map(t => ({
                  id: t.id,
                  ticketCode: t.ticketCode,
                  participantName: t.participantName,
                  ticketCategoryName: t.ticketCategory?.name,
                  hasPendingTransfer: t.transfers.length > 0,
                }))}
              />
            )}
          </div>

          {/* Info banner */}
          {isPaid && (
            <div className="flex gap-3 items-start p-3 rounded-lg bg-primary/5 border border-primary/20 mb-4 text-sm">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">Tiket kamu siap!</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Tunjukkan QR code di bawah saat memasuki venue.
                </p>
              </div>
            </div>
          )}

          {/* Pending banner */}
          {!isPaid && (
            <div className="mb-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
              {tickets[0].vaExpiry
                ? `Selesaikan pembayaran sebelum ${format(tickets[0].vaExpiry, "d MMM yyyy, HH:mm", { locale: id })}`
                : "Pembayaran belum selesai. Silakan selesaikan pembayaran untuk mendapatkan tiket."}
              {tickets[0].midtransToken && (
                <a
                  href={tickets[0].midtransToken}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-2 font-semibold text-yellow-900 underline"
                >
                  Lanjutkan Pembayaran →
                </a>
              )}
            </div>
          )}

          {/* Ticket cards – horizontal scroll */}
          <div className="-mx-6 md:-mx-8 px-6 md:px-8 flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
            {tickets.map((ticket, idx) => (
              <div key={ticket.id} className="rounded-2xl border bg-card overflow-hidden shadow-sm shrink-0 w-72 snap-start">
                {/* Ticket header */}
                <div className="bg-primary px-4 py-2.5 flex items-center justify-center">
                  <span className="text-white text-xs font-semibold uppercase tracking-wider">
                    Tiket {idx + 1} / {tickets.length}
                  </span>
                </div>

                <div className="p-4">
                  {/* Kategori tiket */}
                  {ticket.ticketCategory && (
                    <p className="text-center text-sm font-semibold mb-3">{ticket.ticketCategory.name}</p>
                  )}

                  <Separator className="mb-4" />

                  {/* QR Code */}
                  {isPaid && ticket.qrCodeData ? (
                    <div className="flex flex-col items-center mb-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={ticket.qrCodeData}
                        alt="QR Code"
                        className="w-44 h-44 rounded-xl border bg-white p-2"
                      />
                      <p className="text-[11px] text-muted-foreground mt-2">Scan QR di pintu masuk</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-44 mb-4 rounded-xl border bg-muted">
                      <div className="text-center text-muted-foreground">
                        <QrCode className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p className="text-xs">QR tersedia setelah pembayaran</p>
                      </div>
                    </div>
                  )}

                  {/* Ticket info */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">Peserta</p>
                      <p className="font-semibold">{ticket.participantName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">Kode Tiket</p>
                      <p className="font-mono text-xs font-semibold">{ticket.ticketCode}</p>
                    </div>
                    {ticket.jerseySize && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">Jersey</p>
                        <p className="font-semibold">{ticket.jerseySize}</p>
                      </div>
                    )}
                    {ticket.bibNumber && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">Nomor BIB</p>
                        <p className="font-semibold">#{ticket.bibNumber}</p>
                      </div>
                    )}
                    {ticket.checkedInAt && (
                      <div className="col-span-2">
                        <div className="flex items-center gap-1.5 text-green-600 text-xs font-medium">
                          <CheckCircle2 className="h-4 w-4" />
                          Check-in: {format(ticket.checkedInAt, "HH:mm, d MMM yyyy")}
                        </div>
                      </div>
                    )}
                    {ticket.transfers.length > 0 && (
                      <div className="col-span-2">
                        <div className="flex items-center gap-1.5 text-amber-600 text-xs font-medium">
                          <Clock3 className="h-4 w-4 shrink-0" />
                          Menunggu konfirmasi transfer ke {ticket.transfers[0].toEmail}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Download button */}
                  {isPaid && ticket.qrCodeData && (
                    <div className="mt-4">
                      <DownloadTicketButton
                        data={{
                          qrCodeData: ticket.qrCodeData,
                          ticketCode: ticket.ticketCode,
                          participantName: ticket.participantName,
                          eventTitle: event.title,
                          eventDate: format(eventDate, "EEEE, d MMMM yyyy", { locale: id }),
                          eventTime: format(eventDate, "HH:mm"),
                          eventLocation: event.location,
                          jerseySize: ticket.jerseySize,
                          bibNumber: ticket.bibNumber,
                          participantPhone: ticket.participantPhone,
                          participantEmail: ticket.participantEmail,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Info Event */}
      {activeSection === "info" && (
        <div className="mt-5 space-y-4 text-sm">
          {event.description ? (
            event.description.startsWith("<") ? (
              <div
                className="prose prose-sm max-w-none [&_h2]:text-foreground [&_h3]:text-foreground [&_strong]:text-foreground"
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: event.description }}
              />
            ) : (
              <p className="whitespace-pre-wrap text-muted-foreground">{event.description}</p>
            )
          ) : (
            <p className="text-muted-foreground">Tidak ada deskripsi event.</p>
          )}

          {event.organizer && (
            <div className="pt-2">
              <Separator className="mb-4" />
              <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-2">Penyelenggara</p>
              <div className="flex items-center gap-3">
                {(event.organizer.organizerLogoUrl || event.organizer.avatarUrl) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={event.organizer.organizerLogoUrl ?? event.organizer.avatarUrl!}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover border"
                  />
                )}
                <p className="font-medium text-foreground">{event.organizer.fullName}</p>
              </div>
            </div>
          )}

          <div className="pt-2">
            <Link href={`/event/${event.id}`} className="text-xs text-primary hover:underline">
              Lihat halaman event →
            </Link>
          </div>
        </div>
      )}

      {/* Tab: Lokasi */}
      {activeSection === "lokasi" && (
        <div className="mt-5 space-y-3 text-sm">
          <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Venue</p>
          <div className="flex items-start gap-3 p-4 rounded-xl border bg-card">
            <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">{event.location}</p>
              {event.address && <p className="text-muted-foreground text-xs mt-0.5">{event.address}</p>}
            </div>
          </div>
          <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mt-4">Tanggal & Waktu</p>
          <div className="p-4 rounded-xl border bg-card text-sm space-y-1">
            <p className="font-semibold">{format(eventDate, "EEEE, d MMMM yyyy", { locale: id })}</p>
            <p className="text-muted-foreground">{timeDisplay}</p>
          </div>
        </div>
      )}
    </div>
  );
}
