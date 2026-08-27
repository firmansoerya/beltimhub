import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Ticket, CalendarDays, MapPin, ChevronRight } from "lucide-react";
import { format, isPast } from "date-fns";
import { id } from "date-fns/locale";
import { IncomingTransferBanner } from "@/components/IncomingTransferBanner";

const statusLabel: Record<string, string> = {
  PENDING: "Menunggu Bayar",
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
      event: { select: { id: true, title: true, eventDate: true, location: true, coverImage: true } },
      ticketCategory: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Transfer masuk yang PENDING
  const incomingTransfers = await prisma.ticketTransfer.findMany({
    where: { toUserId: user.id, status: "PENDING" },
    include: {
      ticket: {
        select: {
          ticketCode: true, participantName: true,
          event: { select: { title: true } },
          ticketCategory: { select: { name: true } },
        },
      },
      fromUser: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Kelompokkan berdasarkan orderId (atau ticketId jika tidak ada orderId)
  const groupMap = new Map<string, typeof tickets>();
  for (const ticket of tickets) {
    const key = ticket.orderId ?? ticket.id;
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(ticket);
  }

  const orders = Array.from(groupMap.entries()).map(([key, items]) => ({
    key,
    items,
    event: items[0].event,
    paymentStatus: items[0].paymentStatus,
    totalAmount: items.reduce((s, t) => s + t.amount, 0),
    createdAt: items[0].createdAt,
  }));

  const paidOrders = orders.filter(o => o.paymentStatus === "PAID");
  const aktif = paidOrders.filter(o => !isPast(o.event.eventDate));
  const lalu = paidOrders.filter(o => isPast(o.event.eventDate));
  const pending = orders.filter(o => o.paymentStatus === "PENDING");
  const displayed = isLalu ? lalu : aktif;

  function formatPrice(n: number) {
    if (n === 0) return "Gratis";
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
  }

  return (
    <div>
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-background -mx-6 md:-mx-8 px-6 md:px-8 pt-5 border-b mb-6">
        <h1 className="text-xl font-bold mb-1">Tiket Saya</h1>
        <p className="text-sm text-muted-foreground mb-4">Tiket event yang kamu beli</p>
        <div className="flex gap-1">
          <Link
            href="/dashboard/tiket"
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              !isLalu ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Event Aktif
            {aktif.length > 0 && (
              <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{aktif.length}</span>
            )}
          </Link>
          <Link
            href="/dashboard/tiket?tab=lalu"
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              isLalu ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Event Lalu
            {lalu.length > 0 && (
              <span className="ml-2 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{lalu.length}</span>
            )}
          </Link>
        </div>
      </div>

      {/* Incoming transfer notifications */}
      {incomingTransfers.length > 0 && (
        <IncomingTransferBanner
          transfers={incomingTransfers.map(t => ({
            id: t.id,
            ticketCode: t.ticket.ticketCode,
            participantName: t.ticket.participantName,
            eventTitle: t.ticket.event.title,
            fromUserName: t.fromUser.fullName,
            ticketCategoryName: t.ticket.ticketCategory?.name,
          }))}
        />
      )}

      {/* Daftar order */}
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
          {displayed.map(order => (
            <Link
              key={order.key}
              href={`/dashboard/tiket/order/${order.key}`}
              className="flex gap-4 p-4 rounded-xl border bg-background hover:shadow-sm transition-shadow group"
            >
              {/* Cover */}
              <div className="h-20 w-20 rounded-lg overflow-hidden bg-muted shrink-0">
                {order.event.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={order.event.coverImage} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Ticket className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-semibold text-sm line-clamp-2 leading-snug">{order.event.title}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 font-medium ${statusColor[order.paymentStatus]}`}>
                    {statusLabel[order.paymentStatus]}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                    {format(order.event.eventDate, "d MMM yyyy", { locale: id })}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {order.event.location}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs font-medium text-primary">
                    ×{order.items.length} Tiket
                  </span>
                  {order.totalAmount > 0 && (
                    <span className="text-xs text-muted-foreground">{formatPrice(order.totalAmount)}</span>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <div className="shrink-0 self-center">
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pending orders */}
      {!isLalu && pending.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Menunggu Pembayaran</h2>
          <div className="space-y-3">
            {pending.map(order => (
              <Link
                key={order.key}
                href={`/dashboard/tiket/order/${order.key}`}
                className="flex gap-4 p-4 rounded-xl border border-yellow-200 bg-yellow-50/50 hover:shadow-sm transition-shadow group"
              >
                <div className="h-14 w-14 rounded-lg overflow-hidden bg-muted shrink-0">
                  {order.event.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={order.event.coverImage} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Ticket className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm line-clamp-1">{order.event.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    ×{order.items.length} Tiket · {formatPrice(order.totalAmount)}
                  </p>
                  {order.items[0].vaExpiry && (
                    <p className="text-xs text-yellow-700 mt-0.5">
                      Bayar sebelum {format(order.items[0].vaExpiry, "d MMM, HH:mm", { locale: id })}
                    </p>
                  )}
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
