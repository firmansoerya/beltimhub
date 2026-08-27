"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import { Loader2, Eye, Send } from "lucide-react";

export function DraftEventActions({ eventId }: { eventId: string }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [publishing, setPublishing] = useState(false);

  async function handlePublish(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const ok = await confirm({ description: "Publikasikan event ini sekarang?", confirmLabel: "Publikasikan" });
    if (!ok) return;
    setPublishing(true);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PUBLISHED" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Event berhasil dipublikasikan!");
      router.refresh();
    } catch {
      toast.error("Gagal mempublikasikan event");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
      <a
        href={`/event/${eventId}/preview`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        onClick={e => e.stopPropagation()}
      >
        <Eye className="h-3.5 w-3.5" />
        Pratinjau
      </a>
      <button
        onClick={handlePublish}
        disabled={publishing}
        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
      >
        {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        Publish
      </button>
    </div>
  );
}
