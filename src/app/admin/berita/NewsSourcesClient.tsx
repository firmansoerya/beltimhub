"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewsSourceForm } from "./NewsSourceForm";
import { NewsSourceActions } from "./NewsSourceActions";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface NewsSource {
  id: string;
  name: string;
  siteUrl: string;
  rssUrl: string | null;
  keywords: string[];
  isActive: boolean;
  lastCrawledAt: Date | null;
  articleCount: number;
  createdAt: Date;
}

interface Props {
  sources: NewsSource[];
}

export function NewsSourcesClient({ sources }: Props) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState<NewsSource | null>(null);
  const [isCrawlingAll, setIsCrawlingAll] = useState(false);

  function handleEdit(source: NewsSource) {
    setEditData(source);
    setFormOpen(true);
  }

  function handleAdd() {
    setEditData(null);
    setFormOpen(true);
  }

  async function crawlAll() {
    setIsCrawlingAll(true);
    try {
      const res = await fetch("/api/admin/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        const total = data.results?.reduce((a: number, b: { crawled: number }) => a + b.crawled, 0) ?? 0;
        toast.success(`Crawl semua selesai! ${total} artikel baru.`);
        router.refresh();
      } else {
        toast.error("Crawl gagal");
      }
    } catch {
      toast.error("Gagal menghubungi server");
    } finally {
      setIsCrawlingAll(false);
    }
  }

  return (
    <>
      {/* Header actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
        <p className="text-sm text-muted-foreground">
          {sources.length} sumber terdaftar · {sources.filter((s) => s.isActive).length} aktif
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={crawlAll}
            disabled={isCrawlingAll || sources.filter((s) => s.isActive).length === 0}
          >
            {isCrawlingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Crawl Semua
          </Button>
          <Button size="sm" className="gap-1.5" onClick={handleAdd}>
            + Tambah Sumber
          </Button>
        </div>
      </div>

      {/* Source list */}
      {sources.length === 0 ? (
        <div className="text-center py-20 border rounded-xl bg-card">
          <p className="text-4xl mb-3">📰</p>
          <p className="font-semibold mb-1">Belum ada sumber berita</p>
          <p className="text-sm text-muted-foreground mb-5">
            Tambahkan website berita sebagai sumber crawling otomatis (mendukung RSS maupun Web Scraper)
          </p>
          <Button onClick={handleAdd}>+ Tambah Sumber Pertama</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sources.map((source) => (
            <div
              key={source.id}
              className="bg-card border rounded-xl p-5 transition-all hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        source.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${source.isActive ? "bg-green-500" : "bg-muted-foreground"}`} />
                      {source.isActive ? "Aktif" : "Non-aktif"}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      {source.rssUrl ? "📡 RSS Feed" : "🕷️ Web Scraper"}
                    </span>
                    <h3 className="font-semibold text-foreground">{source.name}</h3>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-0.5 mb-3">
                    <p>
                      <span className="font-medium text-foreground/80">Situs:</span>{" "}
                      <a href={source.siteUrl} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary">
                        {source.siteUrl}
                      </a>
                    </p>
                    {source.rssUrl && (
                      <p>
                        <span className="font-medium text-foreground/80">RSS:</span>{" "}
                        <a href={source.rssUrl} target="_blank" rel="noopener noreferrer" className="hover:underline text-muted-foreground">
                          {source.rssUrl}
                        </a>
                      </p>
                    )}
                  </div>

                  {/* Keywords */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {source.keywords.length > 0 ? (
                      source.keywords.map((kw) => (
                        <Badge key={kw} variant="secondary" className="text-[11px] px-2 py-0">
                          {kw}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded font-normal italic">
                        Tanpa filter kata kunci (Semua berita)
                      </span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      <span className="font-semibold text-foreground">{source.articleCount}</span> artikel ter-crawl
                    </span>
                    {source.lastCrawledAt ? (
                      <span>
                        Crawl terakhir:{" "}
                        {formatDistanceToNow(new Date(source.lastCrawledAt), {
                          addSuffix: true,
                          locale: idLocale,
                        })}
                      </span>
                    ) : (
                      <span className="italic">Belum pernah di-crawl</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t">
                <NewsSourceActions
                  sourceId={source.id}
                  sourceName={source.name}
                  isActive={source.isActive}
                  onEdit={() => handleEdit(source)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <NewsSourceForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditData(null); }}
        editData={editData}
      />
    </>
  );
}
