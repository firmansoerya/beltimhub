"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Trash2, MoreVertical, Loader2, Pencil, EyeOff, Eye } from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import Link from "next/link";

interface ExtraAction {
  label: string;
  action: string;
}

interface Props {
  type: "listing" | "umkm" | "loker";
  id: string;
  extraActions?: ExtraAction[];
  // untuk logika nonaktif/aktifkan
  status?: string;      // listing: ACTIVE | SOLD | EXPIRED
  isActive?: boolean;   // loker: true | false
}

const API_MAP = {
  listing: "/api/listings",
  umkm: "/api/umkm",
  loker: "/api/loker",
};

const EDIT_HREF: Record<string, string> = {
  listing: "/dashboard/iklan",
  umkm: "/dashboard/umkm",
  loker: "/dashboard/loker",
};

export function PostActions({ type, id, extraActions = [], status, isActive }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const baseUrl = `${API_MAP[type]}/${id}`;
  const editHref = `${EDIT_HREF[type]}/${id}/edit`;

  // Apakah item bisa di-nonaktifkan / diaktifkan
  const canDeactivate = type === "listing" && status === "ACTIVE";
  const canReactivate = type === "listing" && status === "EXPIRED";
  const canClose = type === "loker" && isActive === true;
  const canReopen = type === "loker" && isActive === false;

  async function handleDelete() {
    const ok = await confirm({ description: "Yakin ingin menghapus? Tindakan ini tidak bisa dibatalkan.", variant: "destructive", confirmLabel: "Hapus" });
    if (!ok) return;
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

  async function handleAction(action: string) {
    setLoading(action);
    try {
      let body = {};
      if (action === "sold")       body = { status: "SOLD" };
      else if (action === "deactivate") body = { status: "EXPIRED" };
      else if (action === "reactivate") body = { status: "ACTIVE" };
      else if (action === "close")  body = { isActive: false };
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

  function openMenu() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY + 4,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen(v => !v);
  }

  return (
    <div className="shrink-0">
      <button
        ref={btnRef}
        onClick={openMenu}
        className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 bg-background border rounded-lg shadow-lg py-1 min-w-40"
            style={{ top: dropdownPos.top, right: dropdownPos.right }}
          >
            {/* Edit */}
            <Link
              href={editHref}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
              onClick={() => setOpen(false)}
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              Edit
            </Link>

            {/* Extra actions (misal: Tandai Terjual) */}
            {extraActions.map((a) => (
              <button
                key={a.action}
                onClick={() => handleAction(a.action)}
                disabled={!!loading}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                {a.label}
              </button>
            ))}

            {/* Nonaktifkan (listing ACTIVE) */}
            {canDeactivate && (
              <button
                onClick={() => handleAction("deactivate")}
                disabled={!!loading}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
              >
                <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                Nonaktifkan
              </button>
            )}

            {/* Aktifkan kembali (listing EXPIRED) */}
            {canReactivate && (
              <button
                onClick={() => handleAction("reactivate")}
                disabled={!!loading}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
              >
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                Aktifkan Kembali
              </button>
            )}

            {/* Tutup loker */}
            {canClose && (
              <button
                onClick={() => handleAction("close")}
                disabled={!!loading}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
              >
                <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                Tutup Lowongan
              </button>
            )}

            {/* Buka kembali loker */}
            {canReopen && (
              <button
                onClick={() => handleAction("reopen")}
                disabled={!!loading}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
              >
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                Buka Kembali
              </button>
            )}

            <div className="border-t my-1" />

            {/* Hapus */}
            <button
              onClick={handleDelete}
              disabled={!!loading}
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
