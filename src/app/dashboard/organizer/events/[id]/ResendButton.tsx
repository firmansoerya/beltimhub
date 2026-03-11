"use client";

import { useState } from "react";
import { Send } from "lucide-react";

export function ResendButton({ ticketId }: { ticketId: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleResend() {
    setStatus("loading");
    try {
      const res = await fetch(`/api/tickets/${ticketId}/resend`, { method: "POST" });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
    setTimeout(() => setStatus("idle"), 3000);
  }

  return (
    <button
      onClick={handleResend}
      disabled={status === "loading"}
      title="Kirim ulang tiket via WhatsApp"
      className={`p-1.5 rounded-md transition-colors ${
        status === "done"
          ? "text-green-600"
          : status === "error"
            ? "text-red-500"
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
      }`}
    >
      <Send className={`h-3.5 w-3.5 ${status === "loading" ? "animate-pulse" : ""}`} />
    </button>
  );
}
