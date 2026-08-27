"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/ConfirmDialog";

interface Props {
  withdrawalId: string;
  status?: string;
}

export function WithdrawalActions({ withdrawalId, status }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(false);

  async function handleApprove() {
    const ok = await confirm({ description: "Yakin ingin menyetujui penarikan ini? Dana akan dikirim ke rekening penjual via Xendit.", confirmLabel: "Setujui" });
    if (!ok) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/withdrawals/${withdrawalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Gagal menyetujui penarikan");
        return;
      }
      router.refresh();
    } catch {
      alert("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    const reason = await confirm({ description: "Masukkan alasan penolakan:", prompt: true, promptPlaceholder: "Alasan penolakan...", variant: "destructive", confirmLabel: "Tolak" });
    if (!reason) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/withdrawals/${withdrawalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", reason }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Gagal menolak penarikan");
        return;
      }
      router.refresh();
    } catch {
      alert("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  async function handleSimulate() {
    const ok = await confirm({ description: "Simulasi: langsung tandai penarikan ini sebagai COMPLETED tanpa Xendit.", confirmLabel: "Simulasi" });
    if (!ok) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/withdrawals/${withdrawalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "simulate_complete" }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Gagal simulasi");
        return;
      }
      router.refresh();
    } catch {
      alert("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  const canSimulate = ["PENDING", "PROCESSING"].includes(status ?? "");

  return (
    <div className="flex gap-2">
      {status === "PENDING" && (
        <>
          <button
            onClick={handleApprove}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? "..." : "Approve"}
          </button>
          <button
            onClick={handleReject}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? "..." : "Reject"}
          </button>
        </>
      )}
      {canSimulate && process.env.NODE_ENV !== "production" && (
        <button
          onClick={handleSimulate}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-md border border-dashed border-amber-400 text-amber-700 hover:bg-amber-50 disabled:opacity-50 transition-colors font-medium"
        >
          {loading ? "..." : "⚡ Simulate"}
        </button>
      )}
    </div>
  );
}
