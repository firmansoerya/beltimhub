"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X, Loader2, CheckCircle2, AlertCircle, Globe, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface NewsSourceData {
  id: string;
  name: string;
  siteUrl: string;
  rssUrl?: string | null;
  keywords: string[];
  isActive: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  editData?: NewsSourceData | null;
}

export function NewsSourceForm({ open, onClose, editData }: Props) {
  const router = useRouter();
  const isEdit = !!editData;

  const [name, setName] = useState(editData?.name ?? "");
  const [siteUrl, setSiteUrl] = useState(editData?.siteUrl ?? "");
  const [rssUrl, setRssUrl] = useState(editData?.rssUrl ?? "");
  const [keywords, setKeywords] = useState<string[]>(editData?.keywords ?? []);
  const [isActive, setIsActive] = useState(editData?.isActive ?? true);
  const [kwInput, setKwInput] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [testResultMsg, setTestResultMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const kwInputRef = useRef<HTMLInputElement>(null);

  function handleClose() {
    setName(editData?.name ?? "");
    setSiteUrl(editData?.siteUrl ?? "");
    setRssUrl(editData?.rssUrl ?? "");
    setKeywords(editData?.keywords ?? []);
    setIsActive(editData?.isActive ?? true);
    setKwInput("");
    setTestStatus("idle");
    setTestResultMsg(null);
    onClose();
  }

  function addKeyword(raw: string) {
    const kw = raw.trim().toLowerCase();
    if (!kw || keywords.includes(kw)) return;
    setKeywords((prev) => [...prev, kw]);
    setKwInput("");
  }

  function removeKeyword(kw: string) {
    setKeywords((prev) => prev.filter((k) => k !== kw));
  }

  async function testConnection() {
    const targetUrl = rssUrl.trim() || siteUrl.trim();
    if (!targetUrl) {
      toast.error("Masukkan URL situs atau URL RSS terlebih dahulu");
      return;
    }
    setTestStatus("testing");
    setTestResultMsg(null);

    try {
      const res = await fetch(`/api/admin/crawl/test-rss?url=${encodeURIComponent(targetUrl)}`);
      const data = await res.json();
      if (res.ok && data.ok) {
        setTestStatus("ok");
        if (data.discoveredRss && !rssUrl) {
          setRssUrl(data.discoveredRss);
          setTestResultMsg(`RSS terdeteksi otomatis: ${data.discoveredRss}`);
        } else if (data.type === "HTML_SCRAPER") {
          setTestResultMsg(`Mode Web Scraper aktif (${data.itemCount} kandidat artikel terdeteksi)`);
        } else {
          setTestResultMsg(`RSS aktif (${data.itemCount} artikel pada feed)`);
        }
      } else {
        setTestStatus("error");
        setTestResultMsg(data.error ?? "Gagal terhubung ke URL");
      }
    } catch {
      setTestStatus("error");
      setTestResultMsg("Gagal melakukan pengetesan");
    }
  }

  function handleSubmit() {
    if (!name.trim() || !siteUrl.trim()) {
      toast.error("Nama sumber dan URL situs wajib diisi");
      return;
    }

    startTransition(async () => {
      const url = isEdit
        ? `/api/admin/news-sources/${editData!.id}`
        : "/api/admin/news-sources";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          siteUrl: siteUrl.trim(),
          rssUrl: rssUrl.trim() || undefined,
          keywords,
          isActive,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(isEdit ? "Sumber berhasil diperbarui" : "Sumber berita berhasil ditambahkan");
        router.refresh();
        handleClose();
      } else {
        toast.error(data.error ?? "Gagal menyimpan sumber");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            {isEdit ? "Edit Sumber Berita" : "Tambah Sumber Berita"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Nama Sumber */}
          <div className="space-y-1.5">
            <Label htmlFor="src-name">Nama Sumber / Media</Label>
            <Input
              id="src-name"
              placeholder="mis: Tribun Bangka Belitung, Portal Beltim"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* URL Utama Situs */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="src-site">URL Situs / Halaman Berita</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-primary gap-1"
                onClick={testConnection}
                disabled={(!siteUrl && !rssUrl) || testStatus === "testing"}
              >
                {testStatus === "testing" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                Deteksi / Uji URL
              </Button>
            </div>
            <Input
              id="src-site"
              placeholder="https://bangka.tribunnews.com atau https://portal-berita.com/berita"
              value={siteUrl}
              onChange={(e) => {
                setSiteUrl(e.target.value);
                setTestStatus("idle");
                setTestResultMsg(null);
              }}
            />
          </div>

          {/* RSS Feed URL (Opsional) */}
          <div className="space-y-1.5">
            <Label htmlFor="src-rss">
              URL RSS Feed <span className="text-muted-foreground font-normal text-xs">(Opsional)</span>
            </Label>
            <Input
              id="src-rss"
              placeholder="Kosongkan jika tidak ada, sistem akan otomatis scrape halaman web"
              value={rssUrl}
              onChange={(e) => {
                setRssUrl(e.target.value);
                setTestStatus("idle");
                setTestResultMsg(null);
              }}
            />
            <p className="text-[11px] text-muted-foreground">
              Jika situs tidak punya RSS feed, sistem akan otomatis beralih ke <strong>HTML Web Scraper</strong>.
            </p>
          </div>

          {/* Test Status Feedback */}
          {testResultMsg && (
            <div
              className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                testStatus === "ok"
                  ? "bg-green-50 border border-green-200 text-green-800"
                  : "bg-red-50 border border-red-200 text-red-800"
              }`}
            >
              {testStatus === "ok" ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <span>{testResultMsg}</span>
            </div>
          )}

          {/* Kata Kunci Filter */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>
                Kata Kunci Filter (Gate) <span className="text-muted-foreground font-normal text-xs">(Opsional)</span>
              </Label>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <strong>Kosongkan</strong> jika sumber adalah media lokal (semua artikel akan masuk). <br />
              <strong>Isi kata kunci</strong> jika sumber adalah media nasional/regional agar hanya berita tentang Belitung Timur yang disaring.
            </p>
            <div className="flex gap-2">
              <Input
                ref={kwInputRef}
                placeholder="mis: belitung timur (tekan enter/koma)"
                value={kwInput}
                onChange={(e) => setKwInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addKeyword(kwInput);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addKeyword(kwInput)}
                disabled={!kwInput.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {keywords.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {keywords.map((kw) => (
                  <Badge key={kw} variant="secondary" className="gap-1 pr-1 text-xs">
                    {kw}
                    <button
                      type="button"
                      onClick={() => removeKeyword(kw)}
                      className="ml-0.5 hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="mt-1.5 text-[11px] text-muted-foreground/80 bg-muted/40 px-2.5 py-1.5 rounded-lg border border-dashed">
                ✨ <em>Tanpa filter kata kunci — Semua berita dari sumber ini akan di-crawl otomatis.</em>
              </div>
            )}
          </div>

          {/* Status Aktif Switch */}
          {isEdit && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Status Aktif</p>
                <p className="text-xs text-muted-foreground">Sumber non-aktif tidak akan di-crawl</p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isActive ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                    isActive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
              Batal
            </Button>
            <Button type="button" className="flex-1" onClick={handleSubmit} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isEdit ? "Simpan Perubahan" : "Tambah Sumber"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
