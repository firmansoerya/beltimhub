"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2, ImageIcon, X,
  ShieldCheck, FileText, Camera, CheckCircle,
} from "lucide-react";
import { BANK_LIST } from "@/lib/bank-list";

interface DefaultData {
  ktpName: string;
  ktpNumber: string;
  ktpImageUrl: string;
  nibNumber: string;
  nibImageUrl: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  storePhotos: string[];
}

interface Props {
  umkmId: string;
  umkmName: string;
  defaultData: DefaultData;
}

const STEPS = [
  { label: "Syarat & Ketentuan", icon: ShieldCheck },
  { label: "Dokumen & Rekening", icon: FileText },
  { label: "Foto Toko", icon: Camera },
];

export function MarketplaceApplyClient({ umkmId, umkmName, defaultData }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Step 2: Dokumen
  const [ktpName, setKtpName] = useState(defaultData.ktpName);
  const [ktpNumber, setKtpNumber] = useState(defaultData.ktpNumber);
  const [ktpImage, setKtpImage] = useState(defaultData.ktpImageUrl);
  const [nibNumber, setNibNumber] = useState(defaultData.nibNumber);
  const [nibImage, setNibImage] = useState(defaultData.nibImageUrl);
  const [bankName, setBankName] = useState(defaultData.bankName);
  const [bankAccountNumber, setBankAccountNumber] = useState(defaultData.bankAccountNumber);
  const [bankAccountName, setBankAccountName] = useState(defaultData.bankAccountName);

  // Step 3: Foto
  const [storePhotos, setStorePhotos] = useState<string[]>(defaultData.storePhotos);

  function handleImageUpload(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 3 * 1024 * 1024) { toast.error("Maks 3MB per foto"); return; }
      const reader = new FileReader();
      reader.onload = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    };
  }

  function validateStep2(): boolean {
    if (!ktpName.trim()) { toast.error("Nama sesuai KTP wajib diisi"); return false; }
    if (!ktpNumber.trim()) { toast.error("Nomor KTP wajib diisi"); return false; }
    if (!ktpImage) { toast.error("Foto KTP wajib diupload"); return false; }
    if (!bankName.trim()) { toast.error("Nama bank wajib diisi"); return false; }
    if (!bankAccountNumber.trim()) { toast.error("Nomor rekening wajib diisi"); return false; }
    if (!bankAccountName.trim()) { toast.error("Nama pemilik rekening wajib diisi"); return false; }
    return true;
  }

  function validateStep3(): boolean {
    if (storePhotos.length < 1) { toast.error("Upload minimal 1 foto toko atau produk"); return false; }
    return true;
  }

  async function handleSubmit() {
    if (!validateStep3()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/umkm/${umkmId}/marketplace-apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ktpName, ktpNumber, ktpImageUrl: ktpImage,
          nibNumber: nibNumber || undefined,
          nibImageUrl: nibImage || undefined,
          bankName, bankAccountNumber, bankAccountName,
          storePhotos,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Gagal mengirim pengajuan");
      }
      toast.success("Pengajuan berhasil dikirim! Kami akan memproses dalam 1–3 hari kerja.");
      router.push(`/dashboard/umkm/${umkmId}/edit`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
          <button onClick={() => router.push(`/dashboard/umkm/${umkmId}/edit`)} className="hover:text-foreground transition-colors">UMKM</button>
          <span>/</span>
          <span className="text-foreground font-medium">Daftar Pasar Lokal</span>
        </div>
        <h1 className="text-xl font-bold">Daftar Pasar Lokal</h1>
        <p className="text-sm text-muted-foreground mt-1">{umkmName}</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors w-full ${
                isActive ? "bg-primary text-primary-foreground" :
                isDone ? "bg-green-100 text-green-700" :
                "bg-muted text-muted-foreground"
              }`}>
                {isDone ? <CheckCircle className="h-3.5 w-3.5 shrink-0" /> : <Icon className="h-3.5 w-3.5 shrink-0" />}
                <span className="truncate">{s.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step 0: Syarat & Ketentuan */}
      {step === 0 && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="font-semibold text-base">Syarat & Ketentuan Pasar Lokal BeltimHub</h2>

            <div className="max-h-[400px] overflow-y-auto border rounded-lg p-4 text-sm text-muted-foreground space-y-3 bg-muted/20">
              <p className="font-semibold text-foreground">1. Ketentuan Umum</p>
              <p>Pasar Lokal BeltimHub adalah fitur marketplace yang memungkinkan UMKM di Belitung Timur menjual produk secara online melalui platform BeltimHub.</p>

              <p className="font-semibold text-foreground">2. Komisi & Biaya</p>
              <p>Platform mengenakan komisi sebesar <strong>3%</strong> dari setiap transaksi yang berhasil. Tidak ada biaya pendaftaran atau biaya bulanan.</p>

              <p className="font-semibold text-foreground">3. Sistem Escrow</p>
              <p>Dana pembeli akan ditahan oleh platform (escrow) dan diteruskan ke rekening penjual setelah pembeli mengonfirmasi penerimaan barang, atau otomatis setelah 7 hari sejak barang dikirim.</p>

              <p className="font-semibold text-foreground">4. Kewajiban Penjual</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Memproses pesanan dalam waktu maksimal 2x24 jam setelah pembayaran diterima</li>
                <li>Memberikan informasi produk yang akurat dan jujur</li>
                <li>Merespons pesan pembeli dalam waktu yang wajar</li>
                <li>Menyediakan bukti pengiriman (nomor resi) saat mengirim barang</li>
                <li>Menjaga kualitas produk sesuai deskripsi</li>
              </ul>

              <p className="font-semibold text-foreground">5. Verifikasi Identitas</p>
              <p>Untuk keamanan transaksi, penjual wajib menyediakan dokumen identitas (KTP) dan informasi rekening bank yang valid. Data ini digunakan hanya untuk keperluan verifikasi dan pencairan dana.</p>

              <p className="font-semibold text-foreground">6. Pelanggaran & Sanksi</p>
              <p>Platform berhak menonaktifkan toko yang melanggar ketentuan, termasuk namun tidak terbatas pada: penipuan, pengiriman produk yang tidak sesuai, atau tidak merespons pesanan secara berulang.</p>

              <p className="font-semibold text-foreground">7. Produk yang Dilarang</p>
              <p>Dilarang menjual produk ilegal, berbahaya, obat-obatan terlarang, senjata, konten dewasa, atau produk yang melanggar hak kekayaan intelektual.</p>
            </div>

            <label
              className="flex items-start gap-2.5 cursor-pointer select-none"
              onClick={() => setAgreed(v => !v)}
            >
              <div className={`mt-0.5 w-4 h-4 rounded shrink-0 border-2 flex items-center justify-center transition-colors ${agreed ? "bg-primary border-primary" : "border-border"}`}>
                {agreed && (
                  <svg viewBox="0 0 10 8" fill="none" className="w-2.5 h-2.5">
                    <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <p className="text-sm">
                Saya telah membaca dan menyetujui <strong>Syarat & Ketentuan</strong> Pasar Lokal BeltimHub.
              </p>
            </label>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setStep(1)} disabled={!agreed}>
                Lanjutkan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Dokumen & Rekening */}
      {step === 1 && (
        <Card>
          <CardContent className="pt-6 space-y-5">
            <div>
              <h2 className="font-semibold text-base mb-1">Dokumen Identitas</h2>
              <p className="text-xs text-muted-foreground">Data ini digunakan untuk verifikasi penjual. Pastikan informasi sesuai dengan dokumen asli.</p>
            </div>

            {/* KTP */}
            <div className="space-y-3 border-t pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">KTP (Wajib)</p>
              <div>
                <Label>Nama Sesuai KTP *</Label>
                <Input className="mt-1.5" placeholder="Nama lengkap sesuai KTP" value={ktpName} onChange={e => setKtpName(e.target.value)} />
              </div>
              <div>
                <Label>Nomor KTP *</Label>
                <Input className="mt-1.5" placeholder="16 digit NIK" value={ktpNumber} onChange={e => setKtpNumber(e.target.value)} maxLength={16} />
              </div>
              <div>
                <Label>Foto KTP *</Label>
                {ktpImage ? (
                  <div className="relative mt-1.5 rounded-lg overflow-hidden border" style={{ maxWidth: 320 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ktpImage} alt="KTP" className="w-full object-contain" style={{ maxHeight: 200 }} />
                    <button
                      type="button"
                      onClick={() => setKtpImage("")}
                      className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black/80"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 h-28 mt-1.5 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer transition-colors">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-xs font-medium">Upload foto KTP</p>
                      <p className="text-[10px] text-muted-foreground">JPG, PNG — maks. 3MB</p>
                    </div>
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageUpload(setKtpImage)} />
                  </label>
                )}
              </div>
            </div>

            {/* NIB */}
            <div className="space-y-3 border-t pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">NIB / Izin Usaha (Opsional)</p>
              <div>
                <Label>Nomor NIB</Label>
                <Input className="mt-1.5" placeholder="Nomor Induk Berusaha (jika ada)" value={nibNumber} onChange={e => setNibNumber(e.target.value)} />
              </div>
              <div>
                <Label>Foto NIB</Label>
                {nibImage ? (
                  <div className="relative mt-1.5 rounded-lg overflow-hidden border" style={{ maxWidth: 320 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={nibImage} alt="NIB" className="w-full object-contain" style={{ maxHeight: 200 }} />
                    <button type="button" onClick={() => setNibImage("")}
                      className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black/80">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 h-20 mt-1.5 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer transition-colors">
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    <p className="text-[10px] text-muted-foreground">Upload foto NIB (opsional)</p>
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageUpload(setNibImage)} />
                  </label>
                )}
              </div>
            </div>

            {/* Rekening */}
            <div className="space-y-3 border-t pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Informasi Rekening Bank</p>
              <p className="text-xs text-muted-foreground -mt-1">Untuk pencairan dana. Nama pemilik rekening harus sesuai dengan KTP.</p>
              <div>
                <Label>Nama Bank *</Label>
                <Input
                  className="mt-1.5"
                  placeholder="Ketik untuk mencari bank..."
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  list="bank-list"
                  autoComplete="off"
                />
                <datalist id="bank-list">
                  {BANK_LIST.map((bank) => (
                    <option key={bank} value={bank} />
                  ))}
                </datalist>
              </div>
              <div>
                <Label>Nomor Rekening *</Label>
                <Input className="mt-1.5" placeholder="Nomor rekening" value={bankAccountNumber} onChange={e => setBankAccountNumber(e.target.value)} />
              </div>
              <div>
                <Label>Nama Pemilik Rekening *</Label>
                <Input className="mt-1.5" placeholder="Harus sesuai dengan nama di KTP" value={bankAccountName} onChange={e => setBankAccountName(e.target.value)} />
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(0)}>
                Kembali
              </Button>
              <Button onClick={() => { if (validateStep2()) setStep(2); }}>
                Lanjutkan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Foto Toko */}
      {step === 2 && (
        <Card>
          <CardContent className="pt-6 space-y-5">
            <div>
              <h2 className="font-semibold text-base mb-1">Foto Toko & Produk</h2>
              <p className="text-xs text-muted-foreground">Upload minimal 1 foto toko, etalase, atau produk yang akan dijual. Ini membantu admin memverifikasi keberadaan usahamu.</p>
            </div>

            {storePhotos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {storePhotos.map((img, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setStorePhotos(p => p.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-black/80"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {storePhotos.length < 10 && (
              <label className="flex flex-col items-center justify-center gap-2 h-28 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer transition-colors">
                <Camera className="h-6 w-6 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-xs font-medium">Tambah foto ({storePhotos.length}/10)</p>
                  <p className="text-[10px] text-muted-foreground">JPG, PNG — maks. 3MB per foto</p>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    const remaining = 10 - storePhotos.length;
                    files.slice(0, remaining).forEach((file) => {
                      if (file.size > 3 * 1024 * 1024) { toast.error(`${file.name}: Maks 3MB`); return; }
                      const reader = new FileReader();
                      reader.onload = () => setStorePhotos(p => [...p, reader.result as string]);
                      reader.readAsDataURL(file);
                    });
                    e.target.value = "";
                  }}
                />
              </label>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Kembali
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Mengirim...</>
                ) : (
                  <>Kirim Pengajuan</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
