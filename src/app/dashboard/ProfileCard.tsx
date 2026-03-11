"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Pencil, Check, X, Phone, Mail, User, Clock, ShieldCheck } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import Link from "next/link";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  ORGANIZER: "Organizer",
  SELLER: "Seller",
  MEMBER: "Anggota",
};

interface Props {
  fullName: string;
  email: string | null;
  avatarUrl: string | null;
  phoneNumber: string | null;
  role: string;
  isVerified: boolean;
  verificationStatus?: "PENDING" | "REJECTED" | null;
}

export function ProfileCard({ fullName, email, avatarUrl, phoneNumber: initialPhone, role, isVerified, verificationStatus }: Props) {
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [saving, setSaving] = useState(false);

  async function savePhone() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phone || null }),
      });
      if (!res.ok) throw new Error();
      toast.success("Profil diperbarui");
      setEditing(false);
    } catch {
      toast.error("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setPhone(initialPhone ?? "");
    setEditing(false);
  }

  return (
    <div className="bg-background border rounded-xl p-5 flex flex-col gap-4">
      {/* Avatar + nama */}
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={fullName} className="h-full w-full object-cover" />
          ) : (
            <User className="h-7 w-7 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-base truncate">{fullName}</p>
            {isVerified && <VerifiedBadge size="md" />}
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
            {ROLE_LABEL[role] ?? role}
          </span>
        </div>
      </div>

      <hr />

      {/* Status Verifikasi */}
      {!isVerified && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Status Verifikasi</Label>
          {verificationStatus === "PENDING" ? (
            <div className="flex items-center gap-2 text-sm text-yellow-600">
              <Clock className="h-4 w-4 shrink-0" />
              <span>Permohonan sedang diproses</span>
            </div>
          ) : (
            <Link
              href="/dashboard/verifikasi"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              {verificationStatus === "REJECTED" ? "Ajukan ulang verifikasi" : "Ajukan verifikasi akun"}
            </Link>
          )}
        </div>
      )}

      <hr />

      {/* Email (dari Clerk, tidak bisa diubah di sini) */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Email</Label>
        <div className="flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="truncate">{email ?? "—"}</span>
        </div>
        <p className="text-[11px] text-muted-foreground">Dikelola melalui akun login Anda</p>
      </div>

      {/* Nomor HP (bisa diubah) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Nomor WhatsApp / HP</Label>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Pencil className="h-3 w-3" />
              {phone ? "Ubah" : "Tambahkan"}
            </button>
          )}
        </div>

        {editing ? (
          <div className="flex gap-2">
            <div className="flex items-center gap-2 flex-1 border rounded-md px-2.5 bg-background">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className="border-0 p-0 h-8 focus-visible:ring-0 text-sm"
                autoFocus
              />
            </div>
            <Button size="icon" variant="ghost" className="h-9 w-9 text-green-600 hover:bg-green-50" onClick={savePhone} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </Button>
            <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground" onClick={cancelEdit} disabled={saving}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
            {phone ? (
              <span>{phone}</span>
            ) : (
              <span className="text-muted-foreground italic">Belum diisi</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
