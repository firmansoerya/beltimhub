import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { NewsSourcesClient } from "./NewsSourcesClient";
import { Newspaper, FileText } from "lucide-react";
import Link from "next/link";

export default async function AdminBeritaPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId }, select: { role: true } });
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const tab = params.tab === "articles" ? "articles" : "sources";

  const [sources, totalArticles, activeArticles] = await Promise.all([
    prisma.newsSource.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.news.count(),
    prisma.news.count({ where: { isActive: true } }),
  ]);

  // For articles tab
  const articles = tab === "articles"
    ? await prisma.news.findMany({
        orderBy: { publishedAt: "desc" },
        take: 50,
        include: { newsSource: { select: { name: true } } },
      })
    : [];

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 pb-20">
      {/* Header */}
      <div className="mb-6 pb-4 border-b">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mb-1.5">
          <span>Berita</span>
          <span>/</span>
          <span className="text-primary font-semibold">
            {tab === "sources" ? "Sumber Berita" : "Artikel"}
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {tab === "sources" ? "Manajemen Sumber Berita" : "Daftar Artikel"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {tab === "sources"
            ? "Daftarkan sumber RSS dan kata kunci filter untuk crawling otomatis"
            : `${activeArticles} artikel aktif dari ${totalArticles} total`}
        </p>

        {/* Tab pills */}
        <div className="flex gap-2 mt-5">
          <Link
            href="/admin/berita?tab=sources"
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all ${
              tab === "sources"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-background border border-border text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            <Newspaper className="h-4 w-4 shrink-0" />
            Sumber Berita
            <span className={`text-[11px] min-w-[20px] h-5 px-1.5 rounded-full font-bold flex items-center justify-center ${tab === "sources" ? "bg-white/25 text-white" : "bg-muted text-muted-foreground"}`}>
              {sources.length}
            </span>
          </Link>
          <Link
            href="/admin/berita?tab=articles"
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all ${
              tab === "articles"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-background border border-border text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            <FileText className="h-4 w-4 shrink-0" />
            Artikel
            <span className={`text-[11px] min-w-[20px] h-5 px-1.5 rounded-full font-bold flex items-center justify-center ${tab === "articles" ? "bg-white/25 text-white" : "bg-muted text-muted-foreground"}`}>
              {totalArticles}
            </span>
          </Link>
        </div>
      </div>

      {/* Content */}
      {tab === "sources" ? (
        <NewsSourcesClient sources={sources} />
      ) : (
        <ArticlesTab articles={articles} />
      )}
    </div>
  );
}

function ArticlesTab({
  articles,
}: {
  articles: Array<{
    id: string;
    title: string;
    sourceName: string;
    sourceUrl: string;
    isActive: boolean;
    publishedAt: Date;
    newsSource: { name: string } | null;
  }>;
}) {
  if (articles.length === 0) {
    return (
      <div className="text-center py-20 border rounded-xl bg-card">
        <p className="text-4xl mb-3">📭</p>
        <p className="font-semibold mb-1">Belum ada artikel</p>
        <p className="text-sm text-muted-foreground">Tambahkan sumber berita dan lakukan crawl untuk mulai mengumpulkan artikel.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {articles.map((a) => (
        <div key={a.id} className="flex items-start gap-4 bg-card border rounded-xl p-4 hover:shadow-sm transition-all">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${a.isActive ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                {a.isActive ? "Aktif" : "Non-aktif"}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {a.newsSource?.name ?? a.sourceName}
              </span>
            </div>
            <a
              href={a.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium hover:text-primary hover:underline transition-colors line-clamp-2"
            >
              {a.title}
            </a>
            <p className="text-[11px] text-muted-foreground mt-1">
              {new Date(a.publishedAt).toLocaleDateString("id-ID", {
                day: "numeric", month: "long", year: "numeric"
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
