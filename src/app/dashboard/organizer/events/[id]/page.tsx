import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArrowLeft, ScanLine, Users, CheckSquare, TrendingUp, Download, Pencil } from "lucide-react";
import { PublishButton } from "./PublishButton";
import { ResendButton } from "./ResendButton";
import { SearchInput } from "./SearchInput";

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) redirect("/sign-in");

  const { id } = await params;
  const { filter = "all", q = "" } = await searchParams;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      tickets: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!event) notFound();
  if (event.organizerId !== user.id && user.role !== "ADMIN") {
    redirect("/dashboard/organizer");
  }

  const isPublicEvent = event.price === 0 && event.quota >= 999999;
  const isFreeWithQuota = event.price === 0 && !isPublicEvent;
  const paidTickets = event.tickets.filter((t) => t.paymentStatus === "PAID");
  const checkedIn = paidTickets.filter((t) => t.checkedInAt);
  const revenue = paidTickets.reduce((s, t) => s + t.amount, 0);

  const byFilter =
    filter === "checkedin"
      ? paidTickets.filter((t) => t.checkedInAt)
      : filter === "pending"
        ? paidTickets.filter((t) => !t.checkedInAt)
        : filter === "unpaid"
          ? event.tickets.filter((t) => t.paymentStatus !== "PAID")
          : event.tickets;

  const filtered = q
    ? byFilter.filter(
        (t) =>
          t.participantName.toLowerCase().includes(q.toLowerCase()) ||
          (t.participantPhone ?? "").includes(q)
      )
    : byFilter;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <Link
          href="/dashboard/organizer"
          className="mt-1 p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{event.title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date(event.eventDate).toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            · {event.location}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <PublishButton eventId={id} status={event.status} />
          <Link
            href={`/dashboard/organizer/events/${id}/edit`}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-accent transition-colors"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
          {!isPublicEvent && (
            <Link
              href={`/dashboard/organizer/events/${id}/scan`}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <ScanLine className="h-4 w-4" />
              Scan QR
            </Link>
          )}
        </div>
      </div>

      {isPublicEvent ? (
        /* Info event untuk event public */
        <div className="bg-background border rounded-xl overflow-hidden">
          {event.coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.coverImage} alt={event.title} className="w-full aspect-[3/1] object-cover" />
          )}
          <div className="p-6 space-y-4">
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="bg-muted px-2 py-1 rounded-md">{event.category}</span>
              <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-md">Gratis & Terbuka</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Tanggal</p>
                <p className="font-medium">
                  {new Date(event.eventDate).toLocaleDateString("id-ID", {
                    weekday: "long", day: "numeric", month: "long", year: "numeric",
                  })}
                  {" · "}
                  {new Date(event.eventDate).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Lokasi</p>
                <p className="font-medium">{event.location}{event.address ? `, ${event.address}` : ""}</p>
              </div>
            </div>
            {event.description && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Deskripsi</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{event.description}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className={`grid ${isFreeWithQuota ? "grid-cols-2" : "grid-cols-3"} gap-3 mb-6`}>
            {[
              {
                label: isFreeWithQuota ? "Peserta Daftar" : "Peserta Bayar",
                value: paidTickets.length,
                sub: `dari ${event.quota} kuota`,
                icon: Users,
                color: "text-blue-500",
              },
              {
                label: "Sudah Check-in",
                value: checkedIn.length,
                sub: `${paidTickets.length > 0 ? Math.round((checkedIn.length / paidTickets.length) * 100) : 0}% hadir`,
                icon: CheckSquare,
                color: "text-green-500",
              },
              ...(!isFreeWithQuota
                ? [{ label: "Revenue", value: `Rp ${(revenue / 1000).toFixed(0)}k`, sub: `${paidTickets.length} tiket`, icon: TrendingUp, color: "text-orange-500" }]
                : []),
            ].map(({ label, value, sub, icon: Icon, color }) => (
              <div key={label} className="bg-background border rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <p className="text-xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          {/* Participants table */}
          <div className="bg-background border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-1">
            {[
              { key: "all", label: `Semua (${event.tickets.length})` },
              { key: "pending", label: `Belum Check-in (${paidTickets.filter((t) => !t.checkedInAt).length})` },
              { key: "checkedin", label: `Check-in (${checkedIn.length})` },
              { key: "unpaid", label: `Belum Bayar (${event.tickets.filter((t) => t.paymentStatus !== "PAID").length})` },
            ].map(({ key, label }) => (
              <Link
                key={key}
                href={`/dashboard/organizer/events/${id}?filter=${key}`}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  filter === key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <SearchInput defaultValue={q} />
            <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">Tidak ada data</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground w-8">#</th>
                  <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Nama</th>
                  <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground w-36">No. HP</th>
                  <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground w-28">Kode Tiket</th>
                  <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground w-24">Pembayaran</th>
                  <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground w-24">Check-in</th>
                  <th className="w-10 px-2 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((ticket, i) => (
                  <tr key={ticket.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">
                      <span className="block truncate" title={ticket.participantName}>
                        {ticket.participantName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{ticket.participantPhone ?? "—"}</td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {ticket.ticketCode.slice(0, 8)}…
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          ticket.paymentStatus === "PAID"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : ticket.paymentStatus === "PENDING"
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500"
                              : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {ticket.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {ticket.checkedInAt ? (
                        <span className="text-xs text-green-600 dark:text-green-400">
                          ✓{" "}
                          {new Date(ticket.checkedInAt).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-2 py-3 text-center">
                      {ticket.paymentStatus === "PAID" && ticket.participantPhone && (
                        <ResendButton ticketId={ticket.id} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
          </div>
        </>
      )}
    </div>
  );
}
