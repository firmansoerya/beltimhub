"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Eye, Send } from "lucide-react";

export function PreviewBanner({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);

  async function handlePublish() {
    setPublishing(true);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PUBLISHED" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Event berhasil dipublikasikan!");
      router.push(`/event/${eventId}`);
    } catch {
      toast.error("Gagal mempublikasikan event");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div
      className="sticky top-0 z-40 flex items-center justify-between gap-4 px-4 py-2.5 text-sm"
      style={{ background: "linear-gradient(90deg, #7c3aed, #6d28d9)", color: "#fff" }}
    >
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 opacity-80 shrink-0" />
        <span className="font-medium">Mode Pratinjau</span>
        <span className="opacity-70 hidden sm:inline">— Tampilan ini hanya bisa dilihat kamu sebagai penyelenggara.</span>
      </div>
      <button
        onClick={handlePublish}
        disabled={publishing}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-purple-700 hover:bg-white/90 transition-colors disabled:opacity-60 shrink-0"
      >
        {publishing
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : <Send className="h-3.5 w-3.5" />
        }
        Publikasikan
      </button>
    </div>
  );
}
