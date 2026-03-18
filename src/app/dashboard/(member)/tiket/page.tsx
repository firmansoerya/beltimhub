import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Ticket, CalendarDays, MapPin, QrCode } from "lucide-react";
import { formatDistanceToNow, format, isPast } from "date-fns";
import { id } from "date-fns/locale";

const statusLabel: Record<string, string> = {
  PENDING: "Menunggu Pembayaran",
  PAID: "Lunas",
  FAILED: "Gagal",
  EXPIRED: "Kadaluarsa",
  REFUNDED: "Refund",
};

const statusColor: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PAID: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-600",
  EXPIRED: "bg-slate-100 text-slate-500",
  REFUNDED: "bg-blue-100 text-blue-600",
};

export default async function TiketSayaPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
  if (!user) redirect("/sign-in");

  const { tab } = await searchParams;
  const isLalu = tab === "lalu";

  const tickets = await prisma.ticket.findMany({
    where: { userId: user.id },
    include: {
      event: {
        select: { id: true, title: true, eventDate: true, location: true, coverImage: true, status: true },
      },
      ticketCategory: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const aktif = tickets.filter(t => t.paymentStatus === "PAID" && !isPast(t.event.eventDate));
  const lalu = tickets.filter(t => t.paymentStatus === "PAID" && isPast(t.event.eventDate));
  const displayed = isLalu ? lalu : aktif;

  return (
    <div>
      <div className="sticky top-0 z-20 bg-background -mx-6 md:-mx-8 px-6 md:px-8 pt-5 border-b mb-6">
        <h1 className="text-xl font-bold mb-1">Tiket Saya</h1>
        <p className="text-sm text-muted-foreground mb-4">Semua tiket event yang kamu miliki</p>
        {/* Tabs */}
        <div className="flex gap-1">
          <Link
            href="/dashboard/tiket"
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              !isLalu
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Event Aktif
            {aktif.length > 0 && (
              <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                {aktif.length}
              </span>
            )}
          </Link>
          <Link
            href="/dashboard/tiket?tab=lalu"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            isLalu
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Event Lalu
          {lalu.length > 0 && (
            <span className="ml-2 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
              {lalu.length}
            </span>
          )}
          </Link>
        </div>
      </div>

      {displayed.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Ticket className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">
            {isLalu ? "Belum ada event yang sudah selesai" : "Belum ada tiket event aktif"}
          </p>
          <Link href="/event" className="text-primary text-sm hover:underline mt-2 inline-block">
            Jelajahi event
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(ticket => (
            <Link
              key={ticket.id}
              href={`/tiket/${ticket.id}`}
              className="flex gap-4 p-4 rounded-xl border bg-background hover:shadow-sm transition-shadow"
            >
              <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted shrink-0">
                {ticket.event.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ticket.event.coverImage} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Ticket className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm line-clamp-1">{ticket.event.title}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 font-medium ${statusColor[ticket.paymentStatus]}`}>
                    {statusLabel[ticket.paymentStatus]}
                  </span>
                </div>
                {ticket.ticketCategory && (
                  <p className="text-xs text-muted-foreground mt-0.5">{ticket.ticketCategory.name}</p>
                )}
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                    {format(ticket.event.eventDate, "d MMM yyyy", { locale: id })}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {ticket.event.location}
                  </span>
                </div>
              </div>
              <div className="shrink-0 self-center">
                <QrCode className="h-5 w-5 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Tiket pending */}
      {!isLalu && tickets.filter(t => t.paymentStatus === "PENDING").length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Menunggu Pembayaran</h2>
          <div className="space-y-3">
            {tickets.filter(t => t.paymentStatus === "PENDING").map(ticket => (
              <Link
                key={ticket.id}
                href={`/tiket/${ticket.id}`}
                className="flex gap-4 p-4 rounded-xl border border-yellow-200 bg-yellow-50/50 hover:shadow-sm transition-shadow"
              >
                <div className="h-14 w-14 rounded-lg overflow-hidden bg-muted shrink-0">
                  {ticket.event.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ticket.event.coverImage} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Ticket className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm line-clamp-1">{ticket.event.title}</p>
                  <p className="text-xs text-yellow-700 mt-0.5">
                    {ticket.vaExpiry
                      ? `Bayar sebelum ${format(ticket.vaExpiry, "d MMM, HH:mm", { locale: id })}`
                      : "Pembayaran belum selesai"}
                  </p>
                </div>
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full h-fit self-center font-medium shrink-0">
                  Bayar
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
