"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Send, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export function InviteModeratorForm() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;

    setLoading(true);
    setInviteUrl(null);
    try {
      const res = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal mengirim undangan");

      setInviteUrl(data.inviteUrl);
      toast.success("Undangan berhasil dikirim via WhatsApp!");
      setPhone("");
    } catch (err) {
      // WhatsApp gagal tapi undangan tetap dibuat — tampilkan link untuk copy manual
      const errMsg = err instanceof Error ? err.message : "Terjadi kesalahan";
      if (errMsg.includes("WhatsApp")) {
        toast.warning("WhatsApp gagal terkirim, salin link undangan secara manual");
      } else {
        toast.error(errMsg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link disalin!");
  }

  return (
    <div className="bg-background border rounded-xl p-5 space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="phone" className="text-xs text-muted-foreground">
            Nomor WhatsApp
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="08xxxxxxxxxx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={loading || !phone.trim()} className="gap-2">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Kirim Undangan
          </Button>
        </div>
      </form>

      {inviteUrl && (
        <div className="rounded-lg border bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground mb-2">
            Link undangan (berlaku 7 hari):
          </p>
          <div className="flex items-center gap-2">
            <code className="text-xs flex-1 truncate text-foreground">{inviteUrl}</code>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 gap-1.5 h-7 text-xs"
              onClick={copyLink}
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Disalin" : "Salin"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
