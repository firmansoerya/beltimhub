"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertTriangle, ArrowRightLeft, CheckCircle2 } from "lucide-react";

export interface TransferableTicket {
  id: string;
  ticketCode: string;
  participantName: string;
  ticketCategoryName?: string;
  hasPendingTransfer: boolean;
}

interface Props {
  tickets: TransferableTicket[];
  eventTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransferTicketModal({ tickets, eventTitle, open, onOpenChange }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const transferable = tickets.filter(t => !t.hasPendingTransfer);

  const toggleTicket = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0) { setError("Pilih minimal 1 tiket untuk ditransfer."); return; }
    if (!email.trim()) { setError("Masukkan email penerima."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/tickets/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketIds: selectedIds, toEmail: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Gagal mengirim permintaan transfer."); return; }
      setDone(true);
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setSelectedIds([]);
      setEmail("");
      setError("");
      setDone(false);
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            Transfer Tiket
          </DialogTitle>
          <DialogDescription>{eventTitle}</DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="text-center py-4">
            <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
            <p className="font-semibold">Permintaan terkirim!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Penerima perlu mengkonfirmasi sebelum tiket berpindah ke akun mereka.
              Kamu akan mendapat notifikasi setelah tiket dikonfirmasi.
            </p>
            <Button variant="outline" className="mt-4 w-full" onClick={() => handleClose(false)}>
              Tutup
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Warning */}
            <div className="flex gap-2 text-xs p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold">Perhatian sebelum transfer</p>
                <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                  <li>Email tujuan harus terdaftar di BeltimHub</li>
                  <li>Penerima perlu mengkonfirmasi dahulu</li>
                  <li>Tiket tidak bisa dipakai selama proses transfer</li>
                  <li>Transfer permanen, tidak bisa dibatalkan setelah diterima</li>
                </ul>
              </div>
            </div>

            {/* Pilih tiket */}
            <div>
              <p className="text-sm font-medium mb-2">Pilih tiket yang akan ditransfer</p>
              <div className="space-y-2 border rounded-lg p-3">
                {tickets.map(t => (
                  <div key={t.id} className={`flex items-start gap-3 ${t.hasPendingTransfer ? "opacity-50" : ""}`}>
                    <Checkbox
                      id={t.id}
                      checked={selectedIds.includes(t.id)}
                      disabled={t.hasPendingTransfer}
                      onCheckedChange={() => toggleTicket(t.id)}
                      className="mt-0.5"
                    />
                    <Label htmlFor={t.id} className={`flex-1 ${t.hasPendingTransfer ? "cursor-not-allowed" : "cursor-pointer"}`}>
                      <span className="font-medium text-sm">{t.participantName}</span>
                      {t.ticketCategoryName && (
                        <span className="text-xs text-muted-foreground ml-1.5">· {t.ticketCategoryName}</span>
                      )}
                      {t.hasPendingTransfer && (
                        <span className="text-xs text-amber-600 ml-1.5">· sedang ditransfer</span>
                      )}
                      <p className="text-[10px] font-mono text-muted-foreground">{t.ticketCode}</p>
                    </Label>
                  </div>
                ))}
                {transferable.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-1">Semua tiket sedang dalam proses transfer.</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <p className="text-sm font-medium mb-1.5">Email penerima</p>
              <Input
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(""); }}
              />
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={loading || selectedIds.length === 0 || !email.trim()}
            >
              {loading
                ? "Mengirim..."
                : `Transfer ${selectedIds.length > 0 ? `${selectedIds.length} ` : ""}Tiket`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
