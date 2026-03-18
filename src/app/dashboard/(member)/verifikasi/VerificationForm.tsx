"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Upload, CheckCircle2, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface FileState {
  file: File | null;
  preview: string | null;
}

export function VerificationForm() {
  const [ktp, setKtp] = useState<FileState>({ file: null, preview: null });
  const [selfie, setSelfie] = useState<FileState>({ file: null, preview: null });
  const [loading, setLoading] = useState(false);
  const ktpRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<FileState>>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 5MB");
      return;
    }
    const preview = URL.createObjectURL(file);
    setter({ file, preview });
  }

  function clearFile(
    setter: React.Dispatch<React.SetStateAction<FileState>>,
    inputRef: React.RefObject<HTMLInputElement | null>
  ) {
    setter({ file: null, preview: null });
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ktp.file || !selfie.file) {
      toast.error("Upload foto KTP dan selfie terlebih dahulu");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("ktp", ktp.file);
      formData.append("selfie", selfie.file);

      const res = await fetch("/api/verification-request", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Gagal mengajukan verifikasi");
      }

      toast.success("Permohonan verifikasi berhasil dikirim!");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-20">
      {/* KTP Upload */}
      <div className="space-y-2">
        <Label>Foto KTP <span className="text-red-500">*</span></Label>
        {ktp.preview ? (
          <div className="relative rounded-xl overflow-hidden border aspect-video bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ktp.preview} alt="KTP" className="w-full h-full object-contain" />
            <button
              type="button"
              onClick={() => clearFile(setKtp, ktpRef)}
              className="absolute top-2 right-2 bg-background/80 rounded-full p-1 hover:bg-background transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="absolute bottom-2 left-2 flex items-center gap-1 text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">
              <CheckCircle2 className="h-3 w-3" />
              {ktp.file?.name}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => ktpRef.current?.click()}
            className="w-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Upload className="h-8 w-8" />
            <span className="text-sm font-medium">Klik untuk upload foto KTP</span>
            <span className="text-xs">JPG, PNG — maks. 5MB</span>
          </button>
        )}
        <input
          ref={ktpRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => handleFileChange(e, setKtp)}
        />
      </div>

      {/* Selfie Upload */}
      <div className="space-y-2">
        <Label>Selfie Pegang KTP <span className="text-red-500">*</span></Label>
        {selfie.preview ? (
          <div className="relative rounded-xl overflow-hidden border aspect-video bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selfie.preview} alt="Selfie" className="w-full h-full object-contain" />
            <button
              type="button"
              onClick={() => clearFile(setSelfie, selfieRef)}
              className="absolute top-2 right-2 bg-background/80 rounded-full p-1 hover:bg-background transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="absolute bottom-2 left-2 flex items-center gap-1 text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">
              <CheckCircle2 className="h-3 w-3" />
              {selfie.file?.name}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => selfieRef.current?.click()}
            className="w-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Upload className="h-8 w-8" />
            <span className="text-sm font-medium">Klik untuk upload selfie + KTP</span>
            <span className="text-xs">JPG, PNG — maks. 5MB</span>
          </button>
        )}
        <input
          ref={selfieRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => handleFileChange(e, setSelfie)}
        />
      </div>

      <div className="fixed bottom-0 left-0 md:left-56 right-0 z-40 flex items-center gap-6 px-8 py-4 bg-background border-t shadow-md">
        <Button
          type="submit"
          disabled={loading || !ktp.file || !selfie.file}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Mengunggah...
            </>
          ) : (
            "Kirim Permohonan Verifikasi"
          )}
        </Button>
      </div>
    </form>
  );
}
