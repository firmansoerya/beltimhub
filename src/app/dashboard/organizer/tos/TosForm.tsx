"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const TOS_CONTENT = `
**Event Creator**

Halo, selamat datang di BeltimHub — platform digital komunitas Belitung Timur. Sebelum menggunakan fitur Event Creator, harap baca dan pahami Syarat & Ketentuan berikut.

**A. Definisi**

1. "BeltimHub" merujuk pada platform digital yang dikelola oleh tim BeltimHub.
2. "Event Creator" atau "Kreator" adalah pengguna yang membuat dan mengelola event di platform ini.
3. "Peserta" adalah pengguna yang mendaftar atau membeli tiket event.
4. "Platform Fee" adalah biaya layanan yang dipotong dari setiap transaksi tiket berbayar.

**B. Hak dan Kewajiban Kreator**

1. Kreator bertanggung jawab penuh atas kebenaran informasi event yang dipublikasikan, termasuk tanggal, lokasi, harga tiket, dan deskripsi.
2. Kreator wajib menyelenggarakan event sesuai dengan informasi yang tercantum di platform.
3. Kreator wajib memberikan refund kepada peserta jika event dibatalkan oleh pihak penyelenggara.
4. Kreator dilarang membuat event dengan konten yang melanggar hukum, SARA, atau merugikan pihak lain.
5. Kreator bertanggung jawab atas penanganan data peserta sesuai dengan ketentuan privasi yang berlaku.

**C. Pembayaran dan Platform Fee**

1. Untuk event berbayar, BeltimHub mengenakan platform fee sebesar 5% dari harga tiket (atau ditanggung organiser sesuai pilihan saat pembuatan event).
2. Pembayaran tiket diproses melalui gateway pembayaran resmi (Xendit).
3. Payout ke rekening kreator dilakukan setelah event selesai, dengan jadwal dan mekanisme yang akan diinformasikan lebih lanjut.

**D. Konten dan Publikasi**

1. BeltimHub berhak menolak atau menurunkan event yang melanggar ketentuan penggunaan.
2. Kreator memberikan lisensi non-eksklusif kepada BeltimHub untuk menampilkan informasi event di platform.
3. Konten event (foto, deskripsi) menjadi tanggung jawab kreator.

**E. Pembatalan dan Pengembalian Dana**

1. Jika event dibatalkan oleh kreator setelah ada peserta yang membayar, kreator wajib memproses refund dalam waktu 7 hari kerja.
2. BeltimHub tidak bertanggung jawab atas kerugian yang timbul akibat pembatalan event oleh kreator.

**F. Penutup**

Dengan menyetujui ketentuan ini, Anda menyatakan telah membaca, memahami, dan bersedia tunduk pada seluruh Syarat & Ketentuan yang berlaku di BeltimHub sebagai Event Creator.
`.trim();

export function TosForm() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"tos" | "privacy">("tos");
  const scrollRef = useRef<HTMLDivElement>(null);

  async function handleAccept() {
    if (!agreed) { toast.error("Harap centang persetujuan terlebih dahulu"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/profile/accept-organizer-tos", { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success("Selamat datang sebagai Event Creator!");
      router.push("/dashboard/organizer");
    } catch {
      toast.error("Terjadi kesalahan, coba lagi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-background rounded-2xl shadow-xl w-full max-w-2xl">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b">
        <h2 className="text-lg font-bold">Perbarui Persetujuan</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b px-6">
        <button
          onClick={() => setActiveTab("tos")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "tos"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          SYARAT &amp; KETENTUAN
        </button>
        <button
          onClick={() => setActiveTab("privacy")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "privacy"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          PEMROSESAN DATA PRIBADI
        </button>
      </div>

      {/* Content */}
      <div
        ref={scrollRef}
        className="px-6 py-5 h-80 overflow-y-auto text-sm leading-relaxed space-y-3 text-foreground"
      >
        {activeTab === "tos" ? (
          <div className="space-y-3">
            <h3 className="text-base font-bold text-center">Event Creator</h3>
            {TOS_CONTENT.split("\n\n").map((para, i) => (
              <p key={i} className={para.startsWith("**") && para.endsWith("**") ? "font-semibold mt-4" : ""}>
                {para.replace(/\*\*/g, "")}
              </p>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-base font-bold text-center">Pemrosesan Data Pribadi</h3>
            <p>BeltimHub mengumpulkan dan memproses data pribadi kreator untuk keperluan operasional platform, termasuk:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Nama lengkap dan informasi kontak untuk identifikasi akun.</li>
              <li>Data transaksi untuk keperluan pembayaran dan pelaporan keuangan.</li>
              <li>Data event yang dipublikasikan untuk ditampilkan kepada pengguna platform.</li>
              <li>Log aktivitas untuk keperluan keamanan dan peningkatan layanan.</li>
            </ul>
            <p>Data Anda tidak akan dijual kepada pihak ketiga. Anda dapat meminta penghapusan data melalui menu Pengaturan.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t flex items-center justify-between gap-4">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-primary"
          />
          <span className="text-sm text-muted-foreground leading-snug">
            Saya telah membaca dan menyetujui{" "}
            <button onClick={() => setActiveTab("tos")} className="text-primary hover:underline">
              Syarat dan Ketentuan
            </button>{" "}
            dan{" "}
            <button onClick={() => setActiveTab("privacy")} className="text-primary hover:underline">
              Kebijakan Privasi
            </button>{" "}
            di BeltimHub
          </span>
        </label>
        <Button onClick={handleAccept} disabled={!agreed || loading} className="shrink-0">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Selanjutnya
        </Button>
      </div>
    </div>
  );
}
