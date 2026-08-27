"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, Loader2 } from "lucide-react";

interface Props {
  umkmId: string;
}

export function MarketplaceReviewButtons({ umkmId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [reason, setReason] = useState("");

  async function handleApprove() {
    setLoading("approve");
    try {
      const res = await fetch(`/api/admin/marketplace/${umkmId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Gagal");
      toast.success("Toko disetujui dan kini aktif di Pasar Lokal");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(null);
    }
  }

  async function handleReject() {
    if (!reason.trim()) { toast.error("Alasan penolakan wajib diisi"); return; }
    setLoading("reject");
    try {
      const res = await fetch(`/api/admin/marketplace/${umkmId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", reason: reason.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Gagal");
      toast.success("Pengajuan ditolak");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(null);
    }
  }

  if (showRejectForm) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Alasan penolakan (min. 5 karakter)..."
          rows={2}
          style={{
            width: "100%", padding: "6px 10px", fontSize: 13, border: "1px solid #e5e7eb",
            borderRadius: 8, resize: "vertical", outline: "none",
          }}
        />
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => setShowRejectForm(false)}
            style={{
              padding: "5px 12px", fontSize: 12, border: "1px solid #e5e7eb",
              borderRadius: 6, background: "white", cursor: "pointer",
            }}
          >
            Batal
          </button>
          <button
            onClick={handleReject}
            disabled={loading === "reject"}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "5px 12px", fontSize: 12, border: "none",
              borderRadius: 6, background: "#ef4444", color: "white", cursor: "pointer",
            }}
          >
            {loading === "reject" ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <X size={12} />}
            Tolak
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 6 }}>
      <button
        onClick={() => setShowRejectForm(true)}
        style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "5px 12px", fontSize: 12, border: "1px solid #fca5a5",
          borderRadius: 6, background: "#fff5f5", color: "#dc2626", cursor: "pointer",
        }}
      >
        <X size={12} /> Tolak
      </button>
      <button
        onClick={handleApprove}
        disabled={loading === "approve"}
        style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "5px 12px", fontSize: 12, border: "none",
          borderRadius: 6, background: "#16a34a", color: "white", cursor: "pointer",
        }}
      >
        {loading === "approve" ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={12} />}
        Setujui
      </button>
    </div>
  );
}
