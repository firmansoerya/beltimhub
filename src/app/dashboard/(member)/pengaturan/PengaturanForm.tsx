"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Bell, Trash2 } from "lucide-react";

interface Props {
  newsletterEnabled: boolean;
}

export function PengaturanForm({ newsletterEnabled: init }: Props) {
  const router = useRouter();
  const [newsletter, setNewsletter] = useState(init);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  async function toggleNewsletter() {
    const next = !newsletter;
    setNewsletter(next);
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newsletterEnabled: next }),
      });
      if (!res.ok) throw new Error();
      toast.success(next ? "Berlangganan newsletter diaktifkan" : "Berlangganan newsletter dinonaktifkan");
      router.refresh();
    } catch {
      setNewsletter(!next);
      toast.error("Gagal menyimpan pengaturan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Notifikasi */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Notifikasi</h2>
        <div className="flex items-start justify-between gap-4 p-4 rounded-lg border">
          <div className="flex items-start gap-3">
            <Bell className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Newsletter BeltimHub</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Terima informasi terbaru seputar event, UMKM, dan berita dari Belitung Timur langsung ke email kamu.
              </p>
            </div>
          </div>
          <button
            onClick={toggleNewsletter}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
              newsletter ? "bg-primary" : "bg-muted"
            } ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
            role="switch"
            aria-checked={newsletter}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                newsletter ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </section>

      <div className="border-t" />

      {/* Tutup Akun */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Zona Berbahaya</h2>
        <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5 space-y-3">
          <div className="flex items-start gap-3">
            <Trash2 className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Tutup Akun</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Setelah akun ditutup, semua data kamu akan dihapus permanen dan tidak dapat dipulihkan.
                Tiket yang sudah dibeli dan konten yang sudah dipasang akan ikut terhapus.
              </p>
            </div>
          </div>
          {!showDeleteConfirm ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Tutup Akun Saya
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-destructive">Apakah kamu yakin? Tindakan ini tidak dapat dibatalkan.</p>
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" onClick={() => toast.error("Hubungi admin untuk menutup akun")}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Ya, Tutup Akun
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                  Batal
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
