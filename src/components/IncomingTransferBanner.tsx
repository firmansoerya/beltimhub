"use client";

import { useState } from "react";
import { ArrowRightLeft, X, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface IncomingTransfer {
  id: string;
  ticketCode: string;
  participantName: string;
  eventTitle: string;
  fromUserName: string;
  ticketCategoryName?: string;
}

interface Props {
  transfers: IncomingTransfer[];
}

export function IncomingTransferBanner({ transfers: initial }: Props) {
  const [transfers, setTransfers] = useState(initial);
  const [processing, setProcessing] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, "accepted" | "declined">>({});

  if (transfers.length === 0) return null;

  const handleAction = async (transferId: string, action: "accept" | "decline") => {
    setProcessing(transferId);
    try {
      const res = await fetch(`/api/tickets/transfer/${transferId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setDone(prev => ({ ...prev, [transferId]: action === "accept" ? "accepted" : "declined" }));
        setTimeout(() => {
          setTransfers(prev => prev.filter(t => t.id !== transferId));
          setDone(prev => { const n = { ...prev }; delete n[transferId]; return n; });
        }, 3000);
      }
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-2 mb-6">
      {transfers.map(t => {
        const result = done[t.id];
        return (
          <div
            key={t.id}
            className={`rounded-xl border p-3 text-sm transition-colors ${
              result === "accepted"
                ? "bg-green-50 border-green-200"
                : result === "declined"
                ? "bg-slate-50 border-slate-200"
                : "bg-primary/5 border-primary/20"
            }`}
          >
            {result ? (
              <div className="flex items-center gap-2">
                {result === "accepted"
                  ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  : <XCircle className="h-4 w-4 text-slate-400 shrink-0" />}
                <p className="text-xs text-muted-foreground">
                  {result === "accepted"
                    ? `Tiket ${t.participantName} berhasil diterima dan sudah tersimpan.`
                    : `Transfer tiket ${t.participantName} ditolak.`}
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <ArrowRightLeft className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold leading-snug">{t.eventTitle}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <span className="font-medium text-foreground">{t.fromUserName}</span> mengirimkan tiket atas nama{" "}
                    <span className="font-medium text-foreground">{t.participantName}</span>
                    {t.ticketCategoryName && ` (${t.ticketCategoryName})`}
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{t.ticketCode}</p>
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      className="h-7 text-xs px-3"
                      disabled={processing === t.id}
                      onClick={() => handleAction(t.id, "accept")}
                    >
                      {processing === t.id ? "..." : "Terima Tiket"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs px-3"
                      disabled={processing === t.id}
                      onClick={() => handleAction(t.id, "decline")}
                    >
                      Tolak
                    </Button>
                  </div>
                </div>
                <button
                  className="text-muted-foreground hover:text-foreground shrink-0"
                  onClick={() => setTransfers(prev => prev.filter(x => x.id !== t.id))}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
