import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import Link from "next/link";
import {
  Newspaper, Calendar, ShoppingBag, Briefcase, Store,
  ExternalLink, Search, ArrowRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

// Highlight kata yang cocok dalam teks dengan <mark>
function Highlight({ text, words }: { text: string; words: string[] }) {
  if (!words.length) return <>{text}</>;
  const pattern = words
    .filter((w) => w.length >= 2)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  if (!pattern) return <>{text}</>;
  const regex = new RegExp(`(${pattern})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800/60 text-inherit rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

function formatPrice(price: number) {
  if (price === 0) return "Gratis";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);
}

// Bangun kondisi SQL word-boundary: \ykata\y (PostgreSQL regex)
// "run" cocok dengan "Run 5K" dan "Running" tapi TIDAK dengan "warung" atau "turun"
function wb(fields: string[], words: string[]): Prisma.Sql {
  const terms = words.length > 0 ? words : [];
  if (!terms.length) return Prisma.sql`TRUE`;
  const parts = fields.flatMap((f) =>
    terms.map((w) => Prisma.sql`${Prisma.raw(`"${f}"`)} ~* ${`\\y${w}`}`)
  );
  return Prisma.join(parts, " OR ", "(", ")");
}

type NewsRow = { id: string; title: string; snippet: string; sourceUrl: string; sourceName: string; publishedAt: Date };
type EventRow = { id: string; title: string; eventDate: Date; location: string; price: number };
type ListingRow = { id: string; title: string; price: number; category: string; location: string | null };
type JobRow = { id: string; title: string; company: string; type: string; location: string | null };
type UmkmRow = { id: string; name: string; category: string; address: string | null };

async function runSearch(words: string[]) {
  const [news, events, listings, jobs, umkm] = await Promise.all([
    prisma.$queryRaw<NewsRow[]>`
      SELECT id, title, snippet, "sourceUrl", "sourceName", "publishedAt"
      FROM news WHERE "isActive" = true AND ${wb(["title", "snippet"], words)}
      ORDER BY "publishedAt" DESC LIMIT 5`,

    prisma.$queryRaw<EventRow[]>`
      SELECT id, title, "eventDate", location, price
      FROM events WHERE status = 'PUBLISHED' AND ${wb(["title", "description", "location"], words)}
      ORDER BY "eventDate" ASC LIMIT 5`,

    prisma.$queryRaw<ListingRow[]>`
      SELECT id, title, price, category, location
      FROM listings_fjb WHERE status = 'ACTIVE' AND ${wb(["title", "description"], words)}
      ORDER BY "createdAt" DESC LIMIT 5`,

    prisma.$queryRaw<JobRow[]>`
      SELECT id, title, company, type, location
      FROM job_listings WHERE "isActive" = true AND ${wb(["title", "company", "description"], words)}
      ORDER BY "createdAt" DESC LIMIT 5`,

    prisma.$queryRaw<UmkmRow[]>`
      SELECT id, name, category, address
      FROM umkm WHERE ${wb(["name", "description", "category"], words)}
      ORDER BY "createdAt" DESC LIMIT 5`,
  ]);

  return { news, events, listings, jobs, umkm };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const words = query.split(/\s+/).filter((w) => w.length >= 2);
  const searchWords = words.length > 0 ? words : (query ? [query] : []);

  const results = searchWords.length > 0 ? await runSearch(searchWords) : null;
  const totalCount = results
    ? results.news.length + results.events.length + results.listings.length + results.jobs.length + results.umkm.length
    : 0;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Pencarian</h1>
        <p className="text-muted-foreground text-sm">
          {query ? `Hasil pencarian untuk "${query}"` : "Cari berita, event, loker, FJB, dan UMKM"}
        </p>
      </div>

      {/* Search form */}
      <form method="get" action="/cari" className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Ketik kata kunci..."
          autoFocus
          className="w-full pl-11 pr-4 py-3 text-sm rounded-full border border-input bg-background shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </form>

      {!query && (
        <p className="text-center text-muted-foreground text-sm py-16">
          Ketik kata kunci di atas untuk mencari
        </p>
      )}

      {query && totalCount === 0 && (
        <p className="text-center text-muted-foreground text-sm py-16">
          Tidak ada hasil untuk &ldquo;{query}&rdquo;
        </p>
      )}

      {results && totalCount > 0 && (
        <div className="space-y-8">
          {/* Berita */}
          {results.news.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 font-semibold">
                  <Newspaper className="h-4 w-4 text-blue-500" />
                  Berita
                  <span className="text-xs font-normal text-muted-foreground">({results.news.length})</span>
                </div>
                <Link href={`/berita?q=${encodeURIComponent(query)}`} className="text-xs text-primary flex items-center gap-1 hover:underline">
                  Lihat semua <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="space-y-2">
                {results.news.map((item) => (
                  <a
                    key={item.id}
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start justify-between gap-3 rounded-lg border px-4 py-3 hover:bg-muted/50 transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium line-clamp-1 group-hover:text-primary">
                        <Highlight text={item.title} words={words} />
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.sourceName} · {formatDistanceToNow(new Date(item.publishedAt), { addSuffix: true, locale: id })}
                      </p>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Event */}
          {results.events.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 font-semibold">
                  <Calendar className="h-4 w-4 text-purple-500" />
                  Event
                  <span className="text-xs font-normal text-muted-foreground">({results.events.length})</span>
                </div>
                <Link href={`/event?q=${encodeURIComponent(query)}`} className="text-xs text-primary flex items-center gap-1 hover:underline">
                  Lihat semua <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="space-y-2">
                {results.events.map((item) => (
                  <Link
                    key={item.id}
                    href={`/event/${item.id}`}
                    className="flex items-start justify-between gap-3 rounded-lg border px-4 py-3 hover:bg-muted/50 transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium line-clamp-1 group-hover:text-primary">
                        <Highlight text={item.title} words={words} />
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(item.eventDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} · <Highlight text={item.location} words={words} /> · {formatPrice(item.price)}
                      </p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* FJB */}
          {results.listings.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 font-semibold">
                  <ShoppingBag className="h-4 w-4 text-green-500" />
                  Jual Beli
                  <span className="text-xs font-normal text-muted-foreground">({results.listings.length})</span>
                </div>
                <Link href={`/fjb?q=${encodeURIComponent(query)}`} className="text-xs text-primary flex items-center gap-1 hover:underline">
                  Lihat semua <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="space-y-2">
                {results.listings.map((item) => (
                  <Link
                    key={item.id}
                    href={`/fjb/${item.id}`}
                    className="flex items-start justify-between gap-3 rounded-lg border px-4 py-3 hover:bg-muted/50 transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium line-clamp-1 group-hover:text-primary">
                        <Highlight text={item.title} words={words} />
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(item.price)} · <Highlight text={item.category} words={words} />{item.location ? ` · ${item.location}` : ""}
                      </p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Loker */}
          {results.jobs.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 font-semibold">
                  <Briefcase className="h-4 w-4 text-red-500" />
                  Lowongan Kerja
                  <span className="text-xs font-normal text-muted-foreground">({results.jobs.length})</span>
                </div>
                <Link href={`/loker?q=${encodeURIComponent(query)}`} className="text-xs text-primary flex items-center gap-1 hover:underline">
                  Lihat semua <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="space-y-2">
                {results.jobs.map((item) => (
                  <Link
                    key={item.id}
                    href={`/loker/${item.id}`}
                    className="flex items-start justify-between gap-3 rounded-lg border px-4 py-3 hover:bg-muted/50 transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium line-clamp-1 group-hover:text-primary">
                        <Highlight text={item.title} words={words} />
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <Highlight text={item.company} words={words} /> · {item.type}{item.location ? ` · ${item.location}` : ""}
                      </p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* UMKM */}
          {results.umkm.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 font-semibold">
                  <Store className="h-4 w-4 text-orange-500" />
                  UMKM
                  <span className="text-xs font-normal text-muted-foreground">({results.umkm.length})</span>
                </div>
                <Link href={`/umkm?q=${encodeURIComponent(query)}`} className="text-xs text-primary flex items-center gap-1 hover:underline">
                  Lihat semua <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="space-y-2">
                {results.umkm.map((item) => (
                  <Link
                    key={item.id}
                    href={`/umkm/${item.id}`}
                    className="flex items-start justify-between gap-3 rounded-lg border px-4 py-3 hover:bg-muted/50 transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium line-clamp-1 group-hover:text-primary">
                        <Highlight text={item.name} words={words} />
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <Highlight text={item.category} words={words} />{item.address ? ` · ${item.address}` : ""}
                      </p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
