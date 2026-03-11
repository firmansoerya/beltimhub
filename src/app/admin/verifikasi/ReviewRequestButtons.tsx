"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Props {
  requestId: string;
}

export function ReviewRequestButtons({ requestId }: Props) {
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [notes, setNotes] = useState("");
  const router = useRouter();

  async function handle(action: "approve" | "reject") {
    setLoading(action);
    try {
      const res = await fetch(`/api/admin/verification-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes: action === "reject" ? notes : undefined }),
      });
      if (!res.ok) throw new Error();
      toast.success(action === "approve" ? "Permohonan disetujui, user berhasil diverifikasi" : "Permohonan ditolak");
      router.refresh();
    } catch {
      toast.error("Gagal memproses permohonan");
    } finally {
      setLoading(null);
      setShowRejectForm(false);
    }
  }

  if (showRejectForm) {
    return (
      <div className="flex flex-col gap-2 items-end w-full mt-2">
        <textarea
          className="w-full text-sm border rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          rows={2}
          placeholder="Alasan penolakan (opsional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          autoFocus
        />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowRejectForm(false)} disabled={!!loading}>
            Batal
          </Button>
          <Button size="sm" variant="destructive" onClick={() => handle("reject")} disabled={!!loading}>
            {loading === "reject" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Konfirmasi Tolak"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
        onClick={() => setShowRejectForm(true)}
        disabled={!!loading}
      >
        Tolak
      </Button>
      <Button
        size="sm"
        onClick={() => handle("approve")}
        disabled={!!loading}
      >
        {loading === "approve" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Setujui"}
      </Button>
    </div>
  );
}
