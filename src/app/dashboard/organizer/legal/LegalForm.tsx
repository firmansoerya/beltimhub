"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Plus, ChevronDown, ChevronUp } from "lucide-react";

type DocType = "INDIVIDU" | "BADAN_HUKUM";

interface Existing {
  docType: string;
  ktpNumber: string | null;
  ktpName: string | null;
  ktpAddress: string | null;
  ktpImageUrl: string | null;
  npwpNumber: string | null;
  npwpName: string | null;
  npwpAddress: string | null;
  npwpImageUrl: string | null;
  adNumber: string | null;
  adName: string | null;
  adAddress: string | null;
  adImageUrl: string | null;
  nibNumber: string | null;
  status: string;
}

interface Props { existing: Existing | null }

const statusLabel: Record<string, { label: string; cls: string }> = {
  BELUM:    { label: "Belum Terverifikasi", cls: "text-orange-600 bg-orange-50" },
  PENDING:  { label: "Menunggu Verifikasi",  cls: "text-yellow-600 bg-yellow-50" },
  VERIFIED: { label: "Terverifikasi",        cls: "text-green-600 bg-green-50" },
  REJECTED: { label: "Ditolak",             cls: "text-red-600 bg-red-50" },
};

function UploadBox({ imageUrl, label }: { imageUrl: string; label: string }) {
  return (
    <div className="border-2 border-dashed rounded-xl h-40 flex flex-col items-center justify-center gap-2 text-muted-foreground bg-muted/20 overflow-hidden">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={label} className="h-full w-full object-contain p-2" />
      ) : (
        <>
          <Upload className="h-6 w-6 opacity-30" />
          <span className="text-xs text-center px-4">{label}</span>
        </>
      )}
    </div>
  );
}

function DocCol({
  title,
  imageUrl,
  onImageUrl,
  uploadLabel,
  fields,
}: {
  title: string;
  imageUrl: string;
  onImageUrl: (v: string) => void;
  uploadLabel: string;
  fields: { label: string; placeholder?: string; hint?: string; value: string; onChange: (v: string) => void; required?: boolean; maxLength?: number; multiline?: boolean }[];
}) {
  return (
    <div className="flex-1 min-w-0 space-y-3">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <UploadBox imageUrl={imageUrl} label={uploadLabel} />
      <input
        className="w-full text-xs border rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-muted-foreground"
        placeholder={`URL ${title}`}
        value={imageUrl}
        onChange={e => onImageUrl(e.target.value)}
      />
      {fields.map((f, i) => (
        <div key={i}>
          <label className="block text-sm font-medium mb-0.5">
            {f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}
          </label>
          {f.multiline ? (
            <textarea
              className="w-full text-sm border-b pb-1 bg-transparent focus:outline-none focus:border-primary resize-none"
              rows={2}
              placeholder={f.placeholder}
              value={f.value}
              onChange={e => f.onChange(e.target.value)}
            />
          ) : (
            <input
              className="w-full text-sm border-b pb-1 bg-transparent focus:outline-none focus:border-primary"
              placeholder={f.placeholder}
              maxLength={f.maxLength}
              value={f.value}
              onChange={e => f.onChange(e.target.value)}
            />
          )}
          {f.hint && <p className="text-[10px] text-muted-foreground mt-0.5">{f.hint}</p>}
        </div>
      ))}
    </div>
  );
}

export function LegalForm({ existing }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [docType, setDocType] = useState<DocType>((existing?.docType as DocType) ?? "INDIVIDU");
  const [nibOpen, setNibOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const [form, setForm] = useState({
    ktpNumber: existing?.ktpNumber ?? "",
    ktpName: existing?.ktpName ?? "",
    ktpAddress: existing?.ktpAddress ?? "",
    ktpImageUrl: existing?.ktpImageUrl ?? "",
    npwpNumber: existing?.npwpNumber ?? "",
    npwpName: existing?.npwpName ?? "",
    npwpAddress: existing?.npwpAddress ?? "",
    npwpImageUrl: existing?.npwpImageUrl ?? "",
    adNumber: existing?.adNumber ?? "",
    adName: existing?.adName ?? "",
    adAddress: existing?.adAddress ?? "",
    adImageUrl: existing?.adImageUrl ?? "",
    nibNumber: existing?.nibNumber ?? "",
  });

  function s(key: keyof typeof form) {
    return (v: string) => setForm(prev => ({ ...prev, [key]: v }));
  }

  const currentStatus = existing?.status ?? "BELUM";
  const statusInfo = statusLabel[currentStatus] ?? statusLabel.BELUM;
  const isLocked = currentStatus === "VERIFIED";

  async function handleSubmit() {
    if (docType === "INDIVIDU" && (!form.ktpNumber || !form.ktpName || !form.ktpAddress)) {
      toast.error("Isi data KTP terlebih dahulu");
      return;
    }
    if (docType === "BADAN_HUKUM" && (!form.npwpNumber || !form.adNumber)) {
      toast.error("Isi data NPWP dan Anggaran Dasar");
      return;
    }
    if (!agreed) {
      toast.error("Setujui pernyataan terlebih dahulu");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/organizer/legal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docType, ...form }),
      });
      if (!res.ok) throw new Error();
      toast.success("Dokumen dikirim untuk verifikasi");
      router.refresh();
    } catch {
      toast.error("Gagal mengirim dokumen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Status + type selector */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Jenis Dokumen</span>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusInfo.cls}`}>
          {statusInfo.label}
        </span>
      </div>

      {/* Doc type radio */}
      <div className="flex gap-3">
        {(["INDIVIDU", "BADAN_HUKUM"] as DocType[]).map(type => (
          <label
            key={type}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg cursor-pointer text-sm transition-colors flex-1 ${
              docType === type ? "border-primary bg-primary/5 text-primary font-medium" : "text-muted-foreground hover:border-foreground/30"
            }`}
          >
            <input
              type="radio"
              name="docType"
              value={type}
              checked={docType === type}
              onChange={() => setDocType(type)}
              className="accent-primary"
              disabled={isLocked}
            />
            {type === "INDIVIDU" ? "Individu" : "Badan Hukum"}
          </label>
        ))}
      </div>

      {/* ── INDIVIDU ── */}
      {docType === "INDIVIDU" && (
        <div className="border rounded-xl p-5 space-y-4">
          <div className="flex gap-6">
            {/* KTP */}
            <DocCol
              title="KTP"
              imageUrl={form.ktpImageUrl}
              onImageUrl={s("ktpImageUrl")}
              uploadLabel="Unggah dokumen KTP di sini"
              fields={[
                { label: "KTP", placeholder: "Masukkan 16 digit nomor KTP di sini", hint: "Abaikan tanda baca yang tertera di KTP", value: form.ktpNumber, onChange: s("ktpNumber"), required: true, maxLength: 16 },
                { label: "Nama Lengkap (sesuai KTP)", value: form.ktpName, onChange: s("ktpName"), required: true },
                { label: "Alamat (sesuai KTP)", value: form.ktpAddress, onChange: s("ktpAddress"), required: true, multiline: true },
              ]}
            />
            <div className="w-px bg-border shrink-0" />
            {/* NPWP */}
            <DocCol
              title="Nomor NPWP"
              imageUrl={form.npwpImageUrl}
              onImageUrl={s("npwpImageUrl")}
              uploadLabel="Unggah dokumen NPWP di sini"
              fields={[
                { label: "Nomor NPWP", placeholder: "Masukkan 15 digit nomor NPWP di sini", hint: "Abaikan tanda baca yang tertera di NPWP", value: form.npwpNumber, onChange: s("npwpNumber"), maxLength: 15 },
                { label: "Nama Lengkap (sesuai NPWP)", value: form.npwpName, onChange: s("npwpName") },
                { label: "Alamat (sesuai NPWP)", value: form.npwpAddress, onChange: s("npwpAddress"), multiline: true },
              ]}
            />
          </div>
        </div>
      )}

      {/* ── BADAN HUKUM ── */}
      {docType === "BADAN_HUKUM" && (
        <div className="border rounded-xl overflow-hidden">
          {/* Badan Hukum section header */}
          <div className="flex items-center gap-2 px-5 py-3 bg-muted/30 border-b">
            <span className="h-4 w-4 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="text-[8px] text-white font-bold">✓</span>
            </span>
            <span className="text-sm font-medium">Badan Hukum</span>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex gap-6">
              {/* NPWP */}
              <DocCol
                title="NPWP"
                imageUrl={form.npwpImageUrl}
                onImageUrl={s("npwpImageUrl")}
                uploadLabel="Unggah dokumen NPWP di sini"
                fields={[
                  { label: "Nomor NPWP", placeholder: "Masukkan 15 digit nomor NPWP di sini", hint: "Abaikan tanda baca yang tertera di NPWP", value: form.npwpNumber, onChange: s("npwpNumber"), required: true, maxLength: 15 },
                  { label: "Nama Lengkap (sesuai NPWP)", value: form.npwpName, onChange: s("npwpName") },
                  { label: "Alamat (sesuai NPWP)", value: form.npwpAddress, onChange: s("npwpAddress"), multiline: true },
                ]}
              />
              <div className="w-px bg-border shrink-0" />
              {/* Anggaran Dasar */}
              <DocCol
                title="Anggaran Dasar"
                imageUrl={form.adImageUrl}
                onImageUrl={s("adImageUrl")}
                uploadLabel="Unggah dokumen Anggaran Dasar di sini"
                fields={[
                  { label: "Nomor Anggaran Dasar", placeholder: "Masukkan nomor dokumen disini", hint: "Sesuai Anggaran dasar", value: form.adNumber, onChange: s("adNumber"), required: true },
                  { label: "Nama Lengkap (sesuai Anggaran Dasar)", value: form.adName, onChange: s("adName") },
                  { label: "Alamat (sesuai Anggaran Dasar)", value: form.adAddress, onChange: s("adAddress"), multiline: true },
                ]}
              />
            </div>

            {/* NIB collapsible */}
            <div className="border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setNibOpen(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/30 transition-colors"
              >
                <span>Nomor Induk Berusaha</span>
                {nibOpen ? <ChevronUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </button>
              {nibOpen && (
                <div className="px-4 pb-4 border-t">
                  <label className="block text-sm font-medium mt-3 mb-1">NIB</label>
                  <input
                    className="w-full text-sm border-b pb-1 bg-transparent focus:outline-none focus:border-primary"
                    placeholder="Masukkan Nomor Induk Berusaha"
                    value={form.nibNumber}
                    onChange={e => setForm(p => ({ ...p, nibNumber: e.target.value }))}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">
        Harap perhatikan kesesuaian antara identitas pada KTP dan NPWP. Dokumen yang sudah diunggah hanya dapat diubah dengan cara menghubungi tim kami.
      </p>

      {/* Agreement checkbox */}
      {!isLocked && (
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-primary shrink-0"
          />
          <span className="text-xs text-muted-foreground leading-relaxed">
            Dengan ini saya menyatakan dengan sesungguhnya bahwa semua informasi yang disampaikan dalam seluruh lampiran-lampirannya ini adalah benar adanya. Apabila ditemukan dan/atau dibuktikan adanya kesalahan/penipuan/pemalsuan atas informasi yang saya sampaikan, BeltimHub dibebaskan dari setiap akibat dari penggunaan data/dokumen tersebut.
          </span>
        </label>
      )}

      <div className="fixed bottom-0 left-0 md:left-56 right-0 z-40 flex items-center gap-6 px-8 py-4 bg-background border-t shadow-md">
        <Button onClick={handleSubmit} disabled={loading || isLocked || !agreed}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isLocked ? "Terverifikasi" : "Kirim Dokumen"}
        </Button>
      </div>
    </div>
  );
}
