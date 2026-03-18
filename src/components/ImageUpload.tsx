"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Camera, ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  type: "avatar" | "logo" | "banner";
  currentUrl?: string | null;
  onUploaded: (url: string) => void;
  className?: string;
  /** Render the trigger UI. Receives { open, uploading } */
  children?: (opts: { open: () => void; uploading: boolean }) => React.ReactNode;
}

export function ImageUpload({ type, currentUrl, onUploaded, className, children }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const displayUrl = preview ?? currentUrl ?? null;

  async function handleFile(file: File) {
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", type);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Upload gagal"); setPreview(null); return; }
      onUploaded(data.url);
      toast.success("Gambar berhasil diunggah");
    } catch {
      toast.error("Upload gagal, coba lagi");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }

  function open() { inputRef.current?.click(); }

  // Banner mode
  if (type === "banner") {
    return (
      <div className={cn("relative", className)}>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
        />
        <div
          onClick={open}
          className="border-2 border-dashed rounded-xl overflow-hidden cursor-pointer hover:bg-muted/20 transition-colors"
        >
          {displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayUrl} alt="Banner" className="w-full h-40 object-cover" />
          ) : (
            <div className="h-40 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <ImagePlus className="h-8 w-8 opacity-40" />
              <span className="text-sm">Unggah gambar/poster/banner</span>
              <span className="text-xs opacity-60">Klik untuk memilih file (JPG/PNG, maks. 5MB)</span>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            </div>
          )}
        </div>
        {displayUrl && !uploading && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); open(); }}
            className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md hover:bg-black/80 transition-colors flex items-center gap-1"
          >
            <Camera className="h-3 w-3" /> Ganti
          </button>
        )}
      </div>
    );
  }

  // Avatar / Logo mode — custom render via children
  if (children) {
    return (
      <>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
        />
        {children({ open, uploading })}
      </>
    );
  }

  // Default avatar circle
  return (
    <div className={cn("relative shrink-0", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
      <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayUrl} alt="avatar" className="h-full w-full object-cover" />
        ) : (
          <span className="text-2xl font-bold text-muted-foreground">?</span>
        )}
      </div>
      <button
        type="button"
        onClick={open}
        disabled={uploading}
        className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-primary flex items-center justify-center shadow disabled:opacity-50"
      >
        {uploading ? <Loader2 className="h-3 w-3 text-primary-foreground animate-spin" /> : <Camera className="h-3.5 w-3.5 text-primary-foreground" />}
      </button>
    </div>
  );
}
