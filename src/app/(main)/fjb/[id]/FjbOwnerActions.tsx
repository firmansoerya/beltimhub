"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Pencil, CheckCircle, EyeOff, RotateCcw, Loader2 } from "lucide-react";
import Link from "next/link";

interface Props {
  id: string;
  status: string;
  /** Jika true, sembunyikan tombol "Edit Iklan" (sudah ada di halaman dashboard) */
  hideEdit?: boolean;
}

export function FjbOwnerActions({ id, status, hideEdit }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function updateStatus(newStatus: string, confirmMsg: string, successMsg: string) {
    if (!confirm(confirmMsg)) return;
    setLoading(newStatus);
    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success(successMsg);
      router.refresh();
    } catch {
      toast.error("Gagal memperbarui");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {!hideEdit && (
        <Link href={`/fjb/${id}/edit`}>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" />
            Edit Iklan
          </Button>
        </Link>
      )}
      {status === "ACTIVE" && (
        <>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-green-600 border-green-300 hover:bg-green-50"
            onClick={() => updateStatus("SOLD", "Tandai iklan ini sebagai sudah terjual?", "Iklan ditandai sebagai terjual")}
            disabled={!!loading}
          >
            {loading === "SOLD" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
            Tandai Terjual
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() => updateStatus("INACTIVE", "Nonaktifkan iklan ini? Iklan tidak akan terlihat oleh pembeli.", "Iklan dinonaktifkan")}
            disabled={!!loading}
          >
            {loading === "INACTIVE" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <EyeOff className="h-3.5 w-3.5" />}
            Nonaktifkan
          </Button>
        </>
      )}
      {status === "INACTIVE" && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-blue-600 border-blue-300 hover:bg-blue-50"
          onClick={() => updateStatus("ACTIVE", "Aktifkan kembali iklan ini?", "Iklan diaktifkan kembali")}
          disabled={!!loading}
        >
          {loading === "ACTIVE" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
          Aktifkan Kembali
        </Button>
      )}
    </div>
  );
}
