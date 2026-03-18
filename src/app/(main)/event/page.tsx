export const revalidate = 30;

import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, MapPin, Ticket, Search } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "@/lib/utils";

function formatPrice(price: number, isFree: boolean) {
  if (isFree) return "Gratis";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}

const EVENT_CATEGORIES = [
  "Semua", "Lari", "Bersepeda", "Olahraga", "Musik", "Festival",
  "Hiburan", "Pameran", "Seminar", "Workshop", "Webinar",
  "Konferensi", "Komunitas", "Budaya", "Lainnya",
];


async function EventGrid({
  page,
  category,
  harga,
  q,
}: {
  page: number;
  category?: string;
  harga?: string;
  q?: string;
}) {
  const limit = 12;
  const now = new Date();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    status: "PUBLISHED",
    eventDate: { gte: now },
  };

  if (category && category !== "Semua") where.category = category;
  if (harga === "gratis") where.price = 0;
  if (harga === "berbayar") where.price = { gt: 0 };
  if (q?.trim()) where.title = { contains: q.trim(), mode: "insensitive" };

  const [items, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { eventDate: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        organizer: { select: { fullName: true, organizerLogoUrl: true, avatarUrl: true } },
        ticketCategories: { select: { price: true } },
        _count: { select: { tickets: { where: { paymentStatus: "PAID" } } } },
      },
    }),
    prisma.event.count({ where }),
  ]);

  if (items.length === 0) {
    return (
      <div className="col-span-full flex flex-col items-center py-20 text-muted-foreground gap-3">
        <Ticket className="h-12 w-12 opacity-20" />
        <p className="text-sm text-center">Tidak ada event yang sesuai dengan filter.</p>
        <Link href="/event" className="text-xs text-primary underline underline-offset-2">
          Reset filter
        </Link>
      </div>
    );
  }

  const totalPages = Math.ceil(total / limit);

  // Build query string helper
  function pageHref(p: number) {
    const sp = new URLSearchParams();
    sp.set("page", String(p));
    if (category && category !== "Semua") sp.set("category", category);
    if (harga) sp.set("harga", harga);
    if (q) sp.set("q", q);
    return `/event?${sp.toString()}`;
  }

  return (
    <>
      {items.map((event) => {
        const soldCount = event._count.tickets;
        const quota = event.quota;
        const isFull = soldCount >= quota;
        const isPublicEvent = event.price === 0 && quota >= 999999;
        const minPrice = event.ticketCategories.length > 0
          ? Math.min(...event.ticketCategories.map((c) => c.price))
          : event.price;
        const isFree = minPrice === 0;
        const priceLabel = isPublicEvent ? "Gratis" : formatPrice(minPrice, isFree);

        return (
          <Link key={event.id} href={`/event/${event.id}`} className="group block">
            <div className="rounded-xl border border-border/60 bg-card hover:shadow-md hover:border-primary/30 transition-all duration-200">
              {/* Image — overflow-hidden HANYA di sini (fix Safari) */}
              <div
                className="rounded-t-xl overflow-hidden bg-muted"
                style={{ height: "180px", position: "relative" }}
              >
                {event.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={event.coverImage}
                    alt={event.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    className="group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div
                    style={{ width: "100%", height: "100%" }}
                    className="bg-gradient-to-br from-primary/20 via-purple-100 to-purple-200 flex items-center justify-center"
                  >
                    <Ticket className="h-10 w-10 text-primary/30" />
                  </div>
                )}

                {event.package !== "STARTER" && (
                  <span
                    style={{ position: "absolute", top: "10px", left: "10px" }}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-600 text-white"
                  >
                    {event.package}
                  </span>
                )}

                <span
                  style={{ position: "absolute", bottom: "10px", left: "10px" }}
                  className={cn(
                    "text-xs font-bold px-2.5 py-1 rounded-full shadow-sm",
                    isFree ? "bg-green-500 text-white" : "bg-white/95 text-foreground"
                  )}
                >
                  {priceLabel}
                </span>

                {isFull && (
                  <div
                    style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)" }}
                    className="flex items-center justify-center"
                  >
                    <span className="text-white text-sm font-bold tracking-widest">KUOTA PENUH</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div style={{ padding: "12px" }}>
                <span
                  style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "999px", display: "inline-block" }}
                  className="font-medium bg-muted text-muted-foreground border"
                >
                  {event.category}
                </span>

                <p
                  style={{ fontSize: "13px", fontWeight: 600, marginTop: "8px", lineHeight: "1.35", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                  className="group-hover:text-primary transition-colors"
                >
                  {event.title}
                </p>

                <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "3px" }}>
                  <p style={{ fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }} className="text-muted-foreground">
                    <Calendar style={{ width: "11px", height: "11px", flexShrink: 0 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {format(new Date(event.eventDate), "d MMM yyyy · HH:mm", { locale: id })} WIB
                    </span>
                  </p>
                  <p style={{ fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }} className="text-muted-foreground">
                    <MapPin style={{ width: "11px", height: "11px", flexShrink: 0 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{event.location}</span>
                  </p>
                </div>

                <div style={{ height: "1px", background: "var(--border)", margin: "8px 0", opacity: 0.6 }} />

                <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                  {(event.organizer.organizerLogoUrl ?? event.organizer.avatarUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={(event.organizer.organizerLogoUrl ?? event.organizer.avatarUrl)!}
                      alt={event.organizer.fullName}
                      style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid var(--border)" }}
                    />
                  ) : (
                    <div style={{ width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0, background: "var(--muted)", border: "1px solid var(--border)" }} />
                  )}
                  <p style={{ fontSize: "13px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }} className="text-foreground">
                    {event.organizer.fullName}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        );
      })}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="col-span-full flex justify-center gap-2 pt-6">
          {Array.from({ length: totalPages }).map((_, i) => (
            <Link
              key={i}
              href={pageHref(i + 1)}
              className={cn(
                "w-8 h-8 rounded-full text-sm flex items-center justify-center border transition-colors",
                page === i + 1
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-muted border-border text-muted-foreground"
              )}
            >
              {i + 1}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function EventSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/60 overflow-hidden">
          <Skeleton style={{ height: "180px", display: "block" }} className="rounded-none" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-3 w-14 rounded-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2 mt-1" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </>
  );
}

function FilterForm({
  q,
  category,
  harga,
}: {
  q?: string;
  category?: string;
  harga?: string;
}) {
  return (
    <form method="GET" action="/event" className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1">
        <Search
          className="absolute left-3 text-muted-foreground pointer-events-none"
          style={{ top: "50%", transform: "translateY(-50%)", width: "16px", height: "16px" }}
        />
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Cari nama event..."
          className="w-full border border-border rounded-xl bg-background text-sm pl-9 pr-4 py-2.5 outline-none focus:border-primary transition-colors"
        />
      </div>

      {/* Kategori dropdown */}
      <div className="relative">
        <select
          name="category"
          defaultValue={category ?? ""}
          className="appearance-none border border-border rounded-xl bg-background text-sm px-4 py-2.5 pr-8 outline-none focus:border-primary transition-colors text-foreground cursor-pointer"
          style={{ minWidth: "160px" }}
        >
          <option value="">Semua Kategori</option>
          {EVENT_CATEGORIES.filter((c) => c !== "Semua").map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <span
          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground"
          style={{ fontSize: "10px" }}
        >
          ▼
        </span>
      </div>

      {/* Harga dropdown */}
      <div className="relative">
        <select
          name="harga"
          defaultValue={harga ?? ""}
          className="appearance-none border border-border rounded-xl bg-background text-sm px-4 py-2.5 pr-8 outline-none focus:border-primary transition-colors text-foreground cursor-pointer"
          style={{ minWidth: "140px" }}
        >
          <option value="">Semua Harga</option>
          <option value="gratis">Gratis</option>
          <option value="berbayar">Berbayar</option>
        </select>
        <span
          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground"
          style={{ fontSize: "10px" }}
        >
          ▼
        </span>
      </div>

      <button
        type="submit"
        className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
      >
        Cari
      </button>
    </form>
  );
}

export default async function EventPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string; harga?: string; q?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1");
  const category = params.category;
  const harga = params.harga;
  const q = params.q;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Jelajahi Event</h1>
        <p className="text-sm text-muted-foreground mt-1">Event mendatang di Belitung Timur</p>
      </div>

      {/* Search + Filter */}
      <div className="mb-8">
        <FilterForm q={q} category={category} harga={harga} />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Suspense fallback={<EventSkeleton />}>
          <EventGrid page={page} category={category} harga={harga} q={q} />
        </Suspense>
      </div>
    </div>
  );
}
