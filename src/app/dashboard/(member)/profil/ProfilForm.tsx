"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ImageUpload";
import {
  Loader2, Pencil, Check, X, Phone, Mail, User, ShieldCheck,
} from "lucide-react";

interface Props {
  fullName: string;
  firstName: string;
  lastName: string;
  nickname: string | null;
  email: string;
  avatarUrl: string | null;
  phoneNumber: string | null;
  birthDate: string | null;
  isVerified: boolean;
}

type PhoneStep = "idle" | "entering-phone" | "entering-otp";

export function ProfilForm({
  firstName: initFirst, lastName: initLast, nickname: initNickname,
  email, avatarUrl: initAvatar, phoneNumber: initPhone, birthDate: initBirth, isVerified,
}: Props) {
  const router = useRouter();

  const [avatarUrl, setAvatarUrl] = useState(initAvatar);
  const [firstName, setFirstName] = useState(initFirst);
  const [lastName, setLastName] = useState(initLast);
  const [nickname, setNickname] = useState(initNickname ?? "");
  const [birthDate, setBirthDate] = useState(initBirth ? initBirth.substring(0, 10) : "");
  const [saving, setSaving] = useState(false);

  const [phone, setPhone] = useState(initPhone ?? "");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("idle");
  const [inputPhone, setInputPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [normalizedPhone, setNormalizedPhone] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);

  async function saveProfile() {
    if (!firstName.trim()) { toast.error("Nama depan wajib diisi"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim() || undefined,
          nickname: nickname.trim() || null,
          birthDate: birthDate ? new Date(birthDate).toISOString() : null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Profil berhasil disimpan");
      router.refresh();
    } catch {
      toast.error("Terjadi kesalahan, coba lagi");
    } finally {
      setSaving(false);
    }
  }

  async function sendOtp() {
    if (!inputPhone.trim()) return;
    setPhoneLoading(true);
    try {
      const res = await fetch("/api/profile/phone-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: inputPhone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Gagal mengirim OTP"); return; }
      setNormalizedPhone(data.phone);
      setPhoneStep("entering-otp");
      toast.success("Kode OTP dikirim ke WhatsApp Anda");
    } catch { toast.error("Terjadi kesalahan"); }
    finally { setPhoneLoading(false); }
  }

  async function verifyOtp() {
    if (!otp.trim()) return;
    setPhoneLoading(true);
    try {
      const res = await fetch("/api/profile/phone-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone, code: otp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Verifikasi gagal"); return; }
      setPhone(inputPhone.trim());
      setPhoneStep("idle");
      setOtp(""); setInputPhone(""); setNormalizedPhone("");
      toast.success("Nomor WhatsApp berhasil diverifikasi");
      router.refresh();
    } catch { toast.error("Terjadi kesalahan"); }
    finally { setPhoneLoading(false); }
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Avatar */}
      <section className="flex items-center gap-5">
        <ImageUpload type="avatar" currentUrl={avatarUrl} onUploaded={url => setAvatarUrl(url)}>
          {({ open, uploading }) => (
            <div className="relative shrink-0">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <button type="button" onClick={open} disabled={uploading}
                className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-primary flex items-center justify-center shadow disabled:opacity-50">
                {uploading
                  ? <Loader2 className="h-3 w-3 text-primary-foreground animate-spin" />
                  : <span className="text-[10px] text-primary-foreground font-bold leading-none">+</span>
                }
              </button>
            </div>
          )}
        </ImageUpload>
        <div>
          <p className="text-sm font-medium">Foto Profil</p>
          <p className="text-xs text-muted-foreground mt-0.5">Klik ikon + untuk mengunggah foto (JPG/PNG, maks. 2MB)</p>
          {isVerified && (
            <div className="flex items-center gap-1 mt-1 text-xs text-green-600">
              <ShieldCheck className="h-3.5 w-3.5" /><span>Akun Terverifikasi</span>
            </div>
          )}
        </div>
      </section>

      <div className="border-t" />

      {/* Email */}
      <section className="space-y-1.5">
        <Label>Email</Label>
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-md bg-muted/50 border text-sm text-muted-foreground">
          <Mail className="h-4 w-4 shrink-0" /><span>{email || "—"}</span>
        </div>
        <p className="text-xs text-muted-foreground">Email dikelola melalui akun login dan tidak dapat diubah di sini.</p>
      </section>

      {/* Nama & Nickname */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Informasi Pribadi</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">Nama Depan <span className="text-destructive">*</span></Label>
            <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Nama depan" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Nama Belakang</Label>
            <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Nama belakang" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nickname">Nickname / Nama Tampil</Label>
          <Input id="nickname" value={nickname} onChange={e => setNickname(e.target.value)}
            placeholder="Nama yang ditampilkan di postingan (loker, UMKM, iklan)" maxLength={50} />
          <p className="text-xs text-muted-foreground">
            Jika diisi, nama ini yang ditampilkan sebagai penulis di postingan. Kosongkan untuk menggunakan nama asli.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="birthDate">Tanggal Lahir</Label>
          <Input id="birthDate" type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
            max={new Date().toISOString().substring(0, 10)} />
        </div>
      </section>

      {/* Nomor HP */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Nomor WhatsApp / HP</Label>
          {phoneStep === "idle" && (
            <button onClick={() => { setInputPhone(phone); setPhoneStep("entering-phone"); }}
              className="flex items-center gap-1 text-xs text-primary hover:underline">
              <Pencil className="h-3 w-3" />{phone ? "Ubah" : "Tambahkan"}
            </button>
          )}
        </div>
        {phoneStep === "idle" && (
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-md border text-sm">
            <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
            {phone ? <span>{phone}</span> : <span className="text-muted-foreground italic">Belum diisi</span>}
          </div>
        )}
        {phoneStep === "entering-phone" && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="flex items-center gap-2 flex-1 border rounded-md px-2.5">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input value={inputPhone} onChange={e => setInputPhone(e.target.value)}
                  placeholder="08xxxxxxxxxx" className="border-0 p-0 h-9 focus-visible:ring-0 text-sm"
                  autoFocus disabled={phoneLoading} onKeyDown={e => e.key === "Enter" && sendOtp()} />
              </div>
              <Button size="icon" variant="ghost" className="text-green-600 hover:bg-green-50"
                onClick={sendOtp} disabled={phoneLoading || !inputPhone.trim()}>
                {phoneLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </Button>
              <Button size="icon" variant="ghost" className="text-muted-foreground"
                onClick={() => { setPhoneStep("idle"); setInputPhone(""); }} disabled={phoneLoading}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Kode OTP akan dikirim ke WhatsApp Anda</p>
          </div>
        )}
        {phoneStep === "entering-otp" && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Kode OTP dikirim ke <strong>{inputPhone}</strong>. Masukkan 6 digit kode:</p>
            <div className="flex gap-2">
              <Input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456" className="text-center font-mono tracking-[0.3em] text-base"
                autoFocus maxLength={6} disabled={phoneLoading}
                onKeyDown={e => e.key === "Enter" && otp.length === 6 && verifyOtp()} />
              <Button onClick={verifyOtp} disabled={phoneLoading || otp.length !== 6} className="shrink-0">
                {phoneLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verifikasi"}
              </Button>
            </div>
            <div className="flex justify-between">
              <button onClick={() => setPhoneStep("entering-phone")} className="text-xs text-primary hover:underline" disabled={phoneLoading}>Ubah nomor</button>
              <button onClick={sendOtp} className="text-xs text-primary hover:underline" disabled={phoneLoading}>Kirim ulang OTP</button>
            </div>
          </div>
        )}
      </section>

      <div className="fixed bottom-0 left-0 md:left-56 right-0 z-40 flex items-center gap-6 px-8 py-4 bg-background border-t shadow-md">
        <Button onClick={saveProfile} disabled={saving}>
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Menyimpan...</> : "Simpan Perubahan"}
        </Button>
      </div>
    </div>
  );
}
