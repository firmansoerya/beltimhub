"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, RefreshCw, Power, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  sourceId: string;
  sourceName: string;
  isActive: boolean;
  onEdit: () => void;
}

export function NewsSourceActions({ sourceId, sourceName, isActive, onEdit }: Props) {
  const router = useRouter();
  const [isCrawling, startCrawl] = useTransition();
  const [isToggling, startToggle] = useTransition();
  const [isDeleting, startDelete] = useTransition();

  function handleCrawl() {
    startCrawl(async () => {
      const res = await fetch("/api/admin/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(
          `Selesai! ${data.crawled} artikel baru, ${data.skipped} dilewati.`
        );
        router.refresh();
      } else {
        toast.error(data.error ?? "Crawl gagal");
      }
    });
  }

  function handleToggle() {
    startToggle(async () => {
      const res = await fetch(`/api/admin/news-sources/${sourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (res.ok) {
        toast.success(isActive ? "Source dinonaktifkan" : "Source diaktifkan");
        router.refresh();
      } else {
        toast.error("Gagal mengubah status");
      }
    });
  }

  function handleDelete() {
    if (!window.confirm(`Hapus sumber berita "${sourceName}"? Artikel yang sudah ter-crawl tidak akan ikut terhapus.`)) {
      return;
    }
    startDelete(async () => {
      const res = await fetch(`/api/admin/news-sources/${sourceId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success(`"${sourceName}" dihapus`);
        router.refresh();
      } else {
        toast.error("Gagal menghapus");
      }
    });
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 text-xs"
        onClick={handleCrawl}
        disabled={isCrawling || !isActive}
      >
        {isCrawling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        Crawl Sekarang
      </Button>

      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 text-xs"
        onClick={onEdit}
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </Button>

      <Button
        size="sm"
        variant={isActive ? "outline" : "secondary"}
        className="gap-1.5 text-xs"
        onClick={handleToggle}
        disabled={isToggling}
      >
        {isToggling ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Power className="h-3.5 w-3.5" />
        )}
        {isActive ? "Nonaktifkan" : "Aktifkan"}
      </Button>

      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={handleDelete}
        disabled={isDeleting}
      >
        {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        Hapus
      </Button>
    </div>
  );
}
