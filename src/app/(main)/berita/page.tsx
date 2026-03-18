export const revalidate = 60;

import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import Link from "next/link";

async function NewsList({ page, q }: { page: number; q?: string }) {
  const limit = 12;
  const where = {
    isActive: true,
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { snippet: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.news.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.news.count({ where }),
  ]);

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        {q ? `Tidak ada berita untuk "${q}"` : "Belum ada berita tersedia."}
      </div>
    );
  }

  const totalPages = Math.ceil(total / limit);
  const buildHref = (p: number) =>
    `/berita?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <>
      <p className="text-sm text-muted-foreground mb-4">{total} berita ditemukan</p>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((news) => (
          <a
            key={news.id}
            href={news.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Card className="h-full hover:shadow-md transition-shadow group cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary" className="text-xs">
                    {news.sourceName}
                  </Badge>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="font-semibold text-sm leading-snug mb-2 line-clamp-3 group-hover:text-primary transition-colors">
                  {news.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                  {news.snippet}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(news.publishedAt), {
                    addSuffix: true,
                    locale: id,
                  })}
                </div>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-12">
          <Link
            href={buildHref(page - 1)}
            aria-disabled={page <= 1}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border transition-colors ${
              page <= 1
                ? "pointer-events-none opacity-40 bg-muted"
                : "hover:bg-accent"
            }`}
          >
            <ChevronLeft className="h-4 w-4" />
            Sebelumnya
          </Link>

          <div className="flex items-center gap-2 mx-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground text-sm">…</span>
                ) : (
                  <Link
                    key={p}
                    href={buildHref(p as number)}
                    className={`min-w-[2.5rem] h-10 px-3 flex items-center justify-center text-sm rounded-md border transition-colors ${
                      p === page
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-accent"
                    }`}
                  >
                    {p}
                  </Link>
                )
              )}
          </div>

          <Link
            href={buildHref(page + 1)}
            aria-disabled={page >= totalPages}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border transition-colors ${
              page >= totalPages
                ? "pointer-events-none opacity-40 bg-muted"
                : "hover:bg-accent"
            }`}
          >
            Berikutnya
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </>
  );
}

function NewsListSkeleton() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default async function BeritaPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1");
  const q = params.q;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <PageHeader page="berita" />

      <Suspense fallback={<NewsListSkeleton />}>
        <NewsList page={page} q={q} />
      </Suspense>
    </div>
  );
}
