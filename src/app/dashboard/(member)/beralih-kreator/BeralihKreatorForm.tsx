"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, CalendarDays, Megaphone, TicketCheck, TrendingUp, Phone, Check } from "lucide-react";

interface Props {
  phoneNumber: string;
  email: string;
  fullName: string;
}

type Step = "confirm" | "enter-phone" | "enter-otp" | "done";

function normalizePhone(raw: string): string {
  let phone = raw.trim().replace(/\D/g, "");
  if (phone.startsWith("0")) phone = "62" + phone.slice(1);
  if (!phone.startsWith("62")) phone = "62" + phone;
  return phone;
}

export function BeralihKreatorForm({ phoneNumber, email, fullName }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("confirm");
  const [inputPhone, setInputPhone] = useState(phoneNumber);
  const [normalizedPhone, setNormalizedPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendOtp() {
    if (!inputPhone.trim()) { toast.error("Masukkan nomor HP terlebih dahulu"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/profile/phone-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: inputPhone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Gagal mengirim OTP"); return; }
      setNormalizedPhone(data.phone);
      setStep("enter-otp");
      toast.success("Kode OTP dikirim ke WhatsApp Anda");
    } catch { toast.error("Terjadi kesalahan"); }
    finally { setLoading(false); }
  }

  async function verifyAndUpgrade() {
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      const res = await fetch("/api/profile/upgrade-creator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone, code: otp }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Verifikasi gagal"); return; }
      setStep("done");
      toast.success("Akun kreator berhasil diaktifkan!");
    } catch { toast.error("Terjadi kesalahan"); }
    finally { setLoading(false); }
  }

  if (step === "done") {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-lg font-bold">Akun Kreator Aktif!</h2>
        <p className="text-sm text-muted-foreground">
          Selamat {fullName}! Kamu sekarang bisa membuat dan mengelola event di BeltimHub.
        </p>
        <Button onClick={() => router.push("/dashboard/organizer")} className="mt-4">
          Buka Dashboard Kreator
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Benefit cards */}
      {step === "confirm" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: CalendarDays, label: "Buat Event", desc: "Buat event gratis maupun berbayar" },
              { icon: TicketCheck, label: "Kelola Tiket", desc: "Scan & verifikasi peserta di tempat" },
              { icon: Megaphone, label: "Promosi Event", desc: "Jangkau komunitas Belitung Timur" },
              { icon: TrendingUp, label: "Pantau Statistik", desc: "Lihat data pendaftar & pendapatan" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="p-3 rounded-xl border bg-background space-y-1">
                <Icon className="h-5 w-5 text-primary" />
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-muted/50 border space-y-2 text-sm">
            <p className="font-medium">Konfirmasi identitas via OTP</p>
            <p className="text-muted-foreground text-xs">
              Untuk mengaktifkan akun kreator, kami memerlukan verifikasi nomor WhatsApp kamu.
              Kode OTP akan dikirim ke WhatsApp.
            </p>
          </div>

          <Button className="w-full" onClick={() => setStep("enter-phone")}>
            Lanjutkan Aktivasi
          </Button>
        </>
      )}

      {step === "enter-phone" && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nomor WhatsApp</label>
            <div className="flex items-center gap-2 border rounded-md px-3">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                value={inputPhone}
                onChange={e => setInputPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className="border-0 p-0 h-10 focus-visible:ring-0"
                autoFocus
                disabled={loading}
                onKeyDown={e => e.key === "Enter" && sendOtp()}
              />
            </div>
            <p className="text-xs text-muted-foreground">Kode OTP akan dikirim ke nomor ini via WhatsApp</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setStep("confirm")} disabled={loading}>
              Kembali
            </Button>
            <Button className="flex-1" onClick={sendOtp} disabled={loading || !inputPhone.trim()}>
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Mengirim...</> : "Kirim OTP"}
            </Button>
          </div>
        </div>
      )}

      {step === "enter-otp" && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Kode OTP</label>
            <p className="text-xs text-muted-foreground">
              Kode dikirim ke <strong>{inputPhone}</strong>. Masukkan 6 digit kode:
            </p>
            <Input
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              className="text-center font-mono tracking-[0.4em] text-lg h-12"
              autoFocus
              maxLength={6}
              disabled={loading}
              onKeyDown={e => e.key === "Enter" && otp.length === 6 && verifyAndUpgrade()}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setStep("enter-phone")} disabled={loading}>
              Ubah Nomor
            </Button>
            <Button className="flex-1" onClick={verifyAndUpgrade} disabled={loading || otp.length !== 6}>
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Memverifikasi...</> : "Verifikasi & Aktifkan"}
            </Button>
          </div>
          <button onClick={sendOtp} className="text-xs text-primary hover:underline block text-center w-full" disabled={loading}>
            Kirim ulang OTP
          </button>
        </div>
      )}
    </div>
  );
}
