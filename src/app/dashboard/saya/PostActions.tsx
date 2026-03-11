"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, MoreVertical, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ExtraAction {
  label: string;
  action: string;
}

interface Props {
  type: "listing" | "umkm" | "loker";
  id: string;
  extraActions?: ExtraAction[];
}

const API_MAP = {
  listing: "/api/listings",
  umkm: "/api/umkm",
  loker: "/api/loker",
};

export function PostActions({ type, id, extraActions = [] }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const baseUrl = `${API_MAP[type]}/${id}`;

  async function handleDelete() {
    if (!confirm("Yakin ingin menghapus? Tindakan ini tidak bisa dibatalkan.")) return;
    setLoading("delete");
    try {
      const res = await fetch(baseUrl, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus");
      toast.success("Berhasil dihapus");
      router.refresh();
    } catch {
      toast.error("Gagal menghapus");
    } finally {
      setLoading(null);
      setOpen(false);
    }
  }

  async function handleExtra(action: string) {
    setLoading(action);
    try {
      let body = {};
      if (action === "sold") body = { status: "SOLD" };
      else if (action === "close") body = { isActive: false };
      else if (action === "reopen") body = { isActive: true };

      const res = await fetch(baseUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Gagal memperbarui");
      toast.success("Berhasil diperbarui");
      router.refresh();
    } catch {
      toast.error("Gagal memperbarui");
    } finally {
      setLoading(null);
      setOpen(false);
    }
  }

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 bg-background border rounded-lg shadow-lg py-1 min-w-36">
            {extraActions.map((a) => (
              <button
                key={a.action}
                onClick={() => handleExtra(a.action)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                {a.label}
              </button>
            ))}
            <button
              onClick={handleDelete}
              className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Hapus
            </button>
          </div>
        </>
      )}
    </div>
  );
}
