"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Globe, EyeOff, Loader2 } from "lucide-react";

type EventStatus = "DRAFT" | "PUBLISHED" | "ONGOING" | "COMPLETED" | "CANCELLED";

export function PublishButton({ eventId, status }: { eventId: string; status: EventStatus }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const isPublished = status === "PUBLISHED" || status === "ONGOING";

  async function toggle() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: isPublished ? "DRAFT" : "PUBLISHED" }),
      });
      if (!res.ok) throw new Error("Gagal mengubah status");
      toast.success(isPublished ? "Event ditarik ke Draft" : "Event dipublikasikan!");
      router.refresh();
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={isLoading || status === "COMPLETED" || status === "CANCELLED"}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        isPublished
          ? "border border-border hover:bg-accent"
          : "bg-green-600 text-white hover:bg-green-700"
      }`}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isPublished ? (
        <EyeOff className="h-4 w-4" />
      ) : (
        <Globe className="h-4 w-4" />
      )}
      {isPublished ? "Tarik ke Draft" : "Publish"}
    </button>
  );
}
