import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ScanLine, Users, CheckSquare, TrendingUp, Download, Pencil, CalendarDays, MapPin, Tag } from "lucide-react";
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
      ticketCategories: {
        select: { id: true, name: true, quota: true, price: true },
        orderBy: { sortOrder: "asc" },
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
  const hasCategories = event.ticketCategories.length > 0;
  const effectiveQuota = hasCategories
    ? event.ticketCategories.reduce((s, c) => s + c.quota, 0)
    : event.quota;
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

  const statusLabel: Record<string, string> = {
    DRAFT: "Draft", PUBLISHED: "Aktif", ONGOING: "Berlangsung",
    COMPLETED: "Selesai", CANCELLED: "Dibatalkan",
  };
  const statusColor: Record<string, string> = {
    DRAFT: "bg-muted text-muted-foreground",
    PUBLISHED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    ONGOING: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    COMPLETED: "bg-slate-100 text-slate-600",
    CANCELLED: "bg-red-100 text-red-600",
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background -mx-6 md:-mx-8 px-6 md:px-8 py-5 border-b mb-6">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColor[event.status]}`}>
                {statusLabel[event.status]}
              </span>
              <span className="text-xs text-muted-foreground">{event.category}</span>
            </div>
            <h1 className="text-xl font-bold truncate">{event.title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {new Date(event.eventDate).toLocaleDateString("id-ID", {
                weekday: "long", day: "numeric", month: "long", year: "numeric",
              })}{" "}·{" "}{event.location}
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
      </div>

      {isPublicEvent ? (
        /* Layout 2 kolom untuk event public */
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-background border rounded-xl overflow-hidden">
            {event.coverImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={event.coverImage} alt={event.title} className="w-full aspect-video object-cover" />
            )}
            {event.description && (
              <div className="p-5">
                <p className="text-xs text-muted-foreground mb-1 font-medium">Deskripsi</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{event.description}</p>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div className="bg-background border rounded-xl p-5 space-y-4">
              <div className="flex items-start gap-3">
                <CalendarDays className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Tanggal & Waktu</p>
                  <p className="text-sm font-medium">
                    {new Date(event.eventDate).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(event.eventDate).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Lokasi</p>
                  <p className="text-sm font-medium">{event.location}</p>
                  {event.address && <p className="text-xs text-muted-foreground">{event.address}</p>}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Tag className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Tipe</p>
                  <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">Gratis & Terbuka</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Layout 2 kolom untuk event berbayar/bertiket */
        <div className="grid lg:grid-cols-3 gap-6 items-start">
          {/* Kolom kiri: Stats + Tabel peserta */}
          <div className="lg:col-span-2 space-y-5">
            {/* Stats */}
            <div className={`grid ${isFreeWithQuota ? "grid-cols-2" : "grid-cols-3"} gap-3`}>
              {[
                {
                  label: isFreeWithQuota ? "Peserta Daftar" : "Peserta Bayar",
                  value: paidTickets.length,
                  sub: `dari ${effectiveQuota} kuota`,
                  icon: Users,
                  color: "text-blue-500",
                  bg: "bg-blue-50 dark:bg-blue-950/30",
                },
                {
                  label: "Sudah Check-in",
                  value: checkedIn.length,
                  sub: `${paidTickets.length > 0 ? Math.round((checkedIn.length / paidTickets.length) * 100) : 0}% hadir`,
                  icon: CheckSquare,
                  color: "text-green-500",
                  bg: "bg-green-50 dark:bg-green-950/30",
                },
                ...(!isFreeWithQuota
                  ? [{ label: "Total Revenue", value: `Rp ${revenue.toLocaleString("id-ID")}`, sub: `${paidTickets.length} tiket terjual`, icon: TrendingUp, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/30" }]
                  : []),
              ].map(({ label, value, sub, icon: Icon, color, bg }) => (
                <div key={label} className="bg-background border rounded-xl p-4">
                  <div className={`inline-flex p-2 rounded-lg ${bg} mb-3`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>

            {/* Tabel peserta */}
            <div className="bg-background border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b flex items-center justify-between gap-4 flex-wrap">
                <div className="flex gap-1 flex-wrap">
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
                        {hasCategories && (
                          <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground w-32">Kategori</th>
                        )}
                        <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground w-28">Kode Tiket</th>
                        <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground w-24">Pembayaran</th>
                        <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground w-24">Check-in</th>
                        <th className="w-10 px-2 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filtered.map((ticket, i) => {
                        const catName = hasCategories
                          ? event.ticketCategories.find((c) => c.id === ticket.ticketCategoryId)?.name
                          : undefined;
                        return (
                          <tr key={ticket.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                            <td className="px-4 py-3 font-medium">
                              <span className="block truncate max-w-[160px]" title={ticket.participantName}>
                                {ticket.participantName}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{ticket.participantPhone ?? "—"}</td>
                            {hasCategories && (
                              <td className="px-4 py-3">
                                {catName ? (
                                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded truncate block max-w-[120px]">{catName}</span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                            )}
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
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Kolom kanan: Info event + Kategori */}
          <div className="space-y-4">
            {/* Info event */}
            <div className="bg-background border rounded-xl overflow-hidden">
              {event.coverImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={event.coverImage} alt={event.title} className="w-full aspect-video object-cover" />
              )}
              <div className="p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <CalendarDays className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Tanggal</p>
                    <p className="text-sm font-medium">
                      {new Date(event.eventDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.eventDate).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Lokasi</p>
                    <p className="text-sm font-medium">{event.location}</p>
                    {event.address && <p className="text-xs text-muted-foreground">{event.address}</p>}
                  </div>
                </div>
                {!isFreeWithQuota && (
                  <div className="flex items-start gap-2.5">
                    <Tag className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Harga</p>
                      <p className="text-sm font-medium">
                        {hasCategories
                          ? `Mulai Rp ${Math.min(...event.ticketCategories.map(c => c.price)).toLocaleString("id-ID")}`
                          : `Rp ${event.price.toLocaleString("id-ID")}`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Kuota per kategori */}
            {hasCategories && (
              <div className="bg-background border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b">
                  <h3 className="text-sm font-semibold">Kuota per Kategori</h3>
                </div>
                <div className="divide-y">
                  {event.ticketCategories.map((cat) => {
                    const catTickets = paidTickets.filter((t) => t.ticketCategoryId === cat.id);
                    const catPct = cat.quota > 0 ? Math.round((catTickets.length / cat.quota) * 100) : 0;
                    return (
                      <div key={cat.id} className="px-4 py-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-sm font-medium truncate flex-1 mr-2">{cat.name}</p>
                          <p className="text-sm font-semibold shrink-0">{catTickets.length} / {cat.quota}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${Math.min(catPct, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right shrink-0">{catPct}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {cat.price === 0 ? "Gratis" : `Rp ${cat.price.toLocaleString("id-ID")}`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
