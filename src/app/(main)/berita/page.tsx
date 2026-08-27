export const revalidate = 60;

import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/Pagination";
import {
  ExternalLink,
  Clock,
  Newspaper,
  Flame,
  Info,
  Sparkles,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { isFeatureEnabled } from "@/lib/site-settings";
import { FeatureDisabledNotice } from "@/components/FeatureDisabledNotice";
import { NewsFilterBar } from "./NewsFilterBar";

interface NewsItemData {
  id: string;
  title: string;
  snippet: string;
  imageUrl: string | null;
  sourceUrl: string;
  sourceName: string;
  publishedAt: Date;
}

// ── Hero Section for Top Headlines ──
function NewsHero({
  mainNews,
  secondaryNews,
}: {
  mainNews: NewsItemData;
  secondaryNews: NewsItemData[];
}) {
  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Sorotan Utama</span>
        </div>
        <div className="h-px bg-border flex-1" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* 1 Artikel Utama (Headline Utama Besar) */}
        <div className="lg:col-span-7 xl:col-span-8 min-h-0">
          <a
            href={mainNews.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group block h-full bg-card border border-border/80 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-primary/40 flex flex-col"
          >
            {/* Image container - uses padding-bottom for Safari-safe aspect ratio */}
            <div className="relative w-full bg-muted overflow-hidden">
              <div className="relative pb-[62.5%] sm:pb-[56.25%]">
                <div className="absolute inset-0">
                  {mainNews.imageUrl ? (
                    <img
                      src={mainNews.imageUrl}
                      alt={mainNews.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="eager"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-muted to-muted/60 text-muted-foreground p-6 text-center">
                      <Newspaper className="w-16 h-16 mb-2 opacity-30" />
                      <span className="text-xs font-medium">Beltim Today Headline</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent lg:hidden" />
                  <div className="absolute bottom-3 left-3 right-3 lg:hidden text-white">
                    <Badge className="bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold mb-2 shadow-sm">
                      {mainNews.sourceName}
                    </Badge>
                    <h2 className="font-bold text-base sm:text-lg line-clamp-2 leading-snug drop-shadow-sm">
                      {mainNews.title}
                    </h2>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop / Tablet Content Container */}
            <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="hidden lg:flex items-center justify-between gap-2">
                  <Badge variant="secondary" className="bg-rose-500/10 text-rose-700 dark:text-rose-400 font-semibold text-xs border border-rose-200 dark:border-rose-900/50">
                    {mainNews.sourceName}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground/80" />
                    {formatDistanceToNow(new Date(mainNews.publishedAt), {
                      addSuffix: true,
                      locale: id,
                    })}
                  </span>
                </div>

                <h2 className="hidden lg:block text-xl sm:text-2xl font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                  {mainNews.title}
                </h2>

                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                  {mainNews.snippet}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                <span className="lg:hidden flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDistanceToNow(new Date(mainNews.publishedAt), {
                    addSuffix: true,
                    locale: id,
                  })}
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-primary group-hover:underline ml-auto">
                  Baca di {mainNews.sourceName}
                  <ExternalLink className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </a>
        </div>

        {/* 2-3 Artikel Sekunder di Samping Hero */}
        <div className="lg:col-span-5 xl:col-span-4 min-h-0 flex flex-col justify-between gap-3.5">
          {secondaryNews.map((news) => (
            <a
              key={news.id}
              href={news.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group block bg-card border border-border/80 rounded-xl p-3.5 hover:shadow-md transition-all duration-200 hover:border-primary/40 flex-1 flex flex-col justify-between"
            >
              <div className="flex gap-3.5 items-start">
                <div className="w-24 sm:w-28 h-20 sm:h-20 shrink-0 rounded-lg overflow-hidden bg-muted relative aspect-[4/3]">
                  {news.imageUrl ? (
                    <img
                      src={news.imageUrl}
                      alt={news.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                      <Newspaper className="w-6 h-6 opacity-30" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-[11px] font-semibold text-primary">
                      {news.sourceName}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(news.publishedAt), {
                        addSuffix: true,
                        locale: id,
                      })}
                    </span>
                  </div>
                  <h3 className="font-semibold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                    {news.title}
                  </h3>
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="line-clamp-1">{news.snippet ? news.snippet.slice(0, 50) + "..." : ""}</span>
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 text-primary transition-opacity shrink-0 ml-2" />
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Horizontal List Item Component ──
function NewsListItem({ news }: { news: NewsItemData }) {
  return (
    <a
      href={news.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-card border border-border/70 rounded-2xl p-4 hover:shadow-md transition-all duration-200 hover:border-primary/40"
    >
      <div className="flex gap-4 sm:gap-5 items-center sm:items-start">
        {/* Thumbnail Kiri */}
        <div className="w-28 sm:w-44 md:w-52 h-20 sm:h-28 md:h-32 shrink-0 rounded-xl overflow-hidden bg-muted relative aspect-[16/10]">
          {news.imageUrl ? (
            <img
              src={news.imageUrl}
              alt={news.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-muted text-muted-foreground p-2 text-center">
              <Newspaper className="w-8 h-8 opacity-30 mb-1" />
              <span className="text-[10px] hidden sm:inline opacity-60">Beltim Today</span>
            </div>
          )}
        </div>

        {/* Konten Kanan */}
        <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Badge variant="secondary" className="text-[11px] font-semibold bg-muted text-foreground/80 hover:bg-muted">
                {news.sourceName}
              </Badge>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3 text-muted-foreground/70" />
                {formatDistanceToNow(new Date(news.publishedAt), {
                  addSuffix: true,
                  locale: id,
                })}
              </span>
            </div>

            <h3 className="font-bold text-sm sm:text-base md:text-lg text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
              {news.title}
            </h3>

            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-1.5 hidden sm:block leading-relaxed">
              {news.snippet}
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 mt-2 sm:mt-0 text-xs text-muted-foreground">
            <span className="text-[11px] text-muted-foreground/80">
              Sumber: <strong className="font-medium text-foreground/90">{news.sourceName}</strong>
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary group-hover:underline">
              Buka Berita
              <ExternalLink className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}

// ── Sidebar: Berita Terpopuler / Trending & Informasi ──
function NewsSidebar({
  trendingNews,
}: {
  trendingNews: NewsItemData[];
}) {
  return (
    <aside className="space-y-6">
      {/* Widget Berita Terpopuler */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-border/60">
          <div className="w-7 h-7 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">Berita Terpopuler</h3>
            <p className="text-[11px] text-muted-foreground">Paling banyak dibaca warga Beltim</p>
          </div>
        </div>

        <div className="space-y-3.5">
          {/* TODO: Ganti dengan logic views / click tracking jika sudah tersedia di database */}
          {trendingNews.map((news, index) => {
            const rank = index + 1;
            const isTop3 = rank <= 3;

            return (
              <a
                key={news.id}
                href={news.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-3 p-2 rounded-xl hover:bg-muted/60 transition-colors"
              >
                {/* Ranking Number Badge */}
                <span
                  className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                    rank === 1
                      ? "bg-rose-500 text-white shadow-sm shadow-rose-500/30"
                      : rank === 2
                      ? "bg-orange-500 text-white shadow-sm shadow-orange-500/30"
                      : rank === 3
                      ? "bg-amber-500 text-white shadow-sm shadow-amber-500/30"
                      : "bg-muted text-muted-foreground font-semibold"
                  }`}
                >
                  {rank}
                </span>

                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                    {news.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                    <span className="font-medium text-primary/80">{news.sourceName}</span>
                    <span>•</span>
                    <span>
                      {formatDistanceToNow(new Date(news.publishedAt), {
                        addSuffix: true,
                        locale: id,
                      })}
                    </span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>

      {/* Widget Kurasi & Sumber Media */}
      <div className="bg-gradient-to-br from-primary/5 via-card to-card border border-primary/20 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-2.5 text-primary">
          <Info className="w-4 h-4" />
          <h4 className="font-bold text-xs uppercase tracking-wider">Tentang Beltim Today</h4>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
          Beltim Today secara otomatis merangkum berita terkini dari berbagai sumber media terpercaya di Belitung Timur untuk memudahkan masyarakat mendapatkan informasi seputar daerah.
        </p>
        <div className="pt-3 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground font-medium">
          <span>Kurasi Otomatis & Terverifikasi</span>
          <TrendingUp className="w-3.5 h-3.5 text-primary" />
        </div>
      </div>
    </aside>
  );
}

// ── Main News Container (Server Component) ──
async function NewsList({
  page,
  q,
  source,
}: {
  page: number;
  q?: string;
  source?: string;
}) {
  const limit = 12;

  const where = {
    isActive: true,
    ...(source && source !== "Semua" ? { sourceName: { equals: source, mode: "insensitive" as const } } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { snippet: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  // Fetch news, total count, distinct categories, and trending news in parallel
  const [items, total, distinctSources, dbSources, trendingItems] = await Promise.all([
    prisma.news.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.news.count({ where }),
    prisma.news.findMany({
      where: { isActive: true },
      select: { sourceName: true },
      distinct: ["sourceName"],
    }),
    prisma.newsSource.findMany({
      where: { isActive: true },
      select: { name: true },
    }),
    // TODO: Ganti dengan logic views / click tracking jika sudah tersedia di database
    prisma.news.findMany({
      where: { isActive: true },
      orderBy: { publishedAt: "desc" },
      take: 5,
    }),
  ]);

  // Merge unique categories for the horizontal tab bar
  const allCategoryNames = Array.from(
    new Set([
      ...dbSources.map((s) => s.name),
      ...distinctSources.map((s) => s.sourceName),
    ])
  ).filter(Boolean);

  const totalPages = Math.ceil(total / limit);
  const buildHref = (p: number) =>
    `/berita?${new URLSearchParams({
      ...(source && source !== "Semua" ? { source: source } : {}),
      ...(q ? { q } : {}),
      page: String(p),
    })}`;

  // Check if we show Hero Section (Page 1 without search query)
  const isFirstPage = page === 1;
  const showHero = isFirstPage && items.length >= 3;

  const heroMain = showHero ? items[0] : null;
  const heroSecondary = showHero ? items.slice(1, 4) : [];
  const listArticles = showHero ? items.slice(4) : items;

  return (
    <>
      {/* Horizontal Category Tabs & Search Bar */}
      <NewsFilterBar
        categories={allCategoryNames}
        activeCategory={source}
        searchQuery={q}
      />

      {items.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border/80 rounded-2xl p-8">
          <Newspaper className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="font-semibold text-lg text-foreground mb-1">Tidak Ada Berita Ditemukan</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
            {q
              ? `Tidak ditemukan berita yang cocok dengan kata kunci "${q}".`
              : source
              ? `Belum ada berita dari sumber "${source}".`
              : "Belum ada berita yang tersedia saat ini."}
          </p>
          {(q || (source && source !== "Semua")) && (
            <Link
              href="/berita"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Lihat Semua Berita
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Hero Section (Headline besar + 2-3 sekunder) */}
          {heroMain && (
            <NewsHero mainNews={heroMain} secondaryNews={heroSecondary} />
          )}

          {/* Section Heading & Result Counter */}
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/60">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-lg text-foreground">
                {source && source !== "Semua" ? `Berita ${source}` : q ? `Hasil Pencarian: "${q}"` : "Daftar Berita Terkini"}
              </h2>
              <span className="text-xs text-muted-foreground font-normal">
                ({total} berita)
              </span>
            </div>
            {source && (
              <Link
                href="/berita"
                className="text-xs font-medium text-primary hover:underline flex items-center gap-0.5"
              >
                Reset filter
                <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>

          {/* 2-Column Layout: Main Article List + Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Kolom Kiri: Daftar Artikel Horizontal List */}
            <div className="lg:col-span-8 space-y-4">
              {listArticles.length > 0 ? (
                listArticles.map((news) => (
                  <NewsListItem key={news.id} news={news} />
                ))
              ) : (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  Semua artikel telah ditampilkan di bagian sorotan utama di atas.
                </div>
              )}

              {/* Pagination */}
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                buildHref={buildHref}
              />
            </div>

            {/* Kolom Kanan: Sidebar Berita Terpopuler / Trending */}
            <div className="lg:col-span-4">
              <NewsSidebar trendingNews={trendingItems} />
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ── Skeleton Loader ──
function NewsListSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Filter bar skeleton */}
      <div className="h-14 bg-card border rounded-2xl p-4 flex items-center justify-between" />

      {/* Hero skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 xl:col-span-8 bg-card border rounded-2xl p-5 space-y-4">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-3.5">
          <div className="bg-card border rounded-xl p-3.5 space-y-2 flex-1">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <div className="bg-card border rounded-xl p-3.5 space-y-2 flex-1">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      </div>

      {/* List + Sidebar skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border rounded-2xl p-4 flex gap-4">
              <Skeleton className="w-44 h-28 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            </div>
          ))}
        </div>
        <div className="lg:col-span-4">
          <div className="bg-card border rounded-2xl p-5 space-y-3">
            <Skeleton className="h-5 w-32 mb-2" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function BeritaPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; source?: string }>;
}) {
  const isEnabled = await isFeatureEnabled("berita");
  if (!isEnabled) {
    return <FeatureDisabledNotice featureName="Berita & Warta" />;
  }

  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10) || 1;
  const q = params.q;
  const source = params.source;

  return (
    <div className="min-h-screen bg-muted/20 pb-16">
      <PageHeader page="berita" />

      <main className="container mx-auto max-w-6xl px-4 py-8">
        <Suspense fallback={<NewsListSkeleton />}>
          <NewsList page={page} q={q} source={source} />
        </Suspense>
      </main>
    </div>
  );
}
