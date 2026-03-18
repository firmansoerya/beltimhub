"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";

export function ImageGallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");

  const openLightbox = (i: number) => setLightbox(i);
  const closeLightbox = () => setLightbox(null);

  const prevLightbox = useCallback(() => {
    setZoomed(false);
    setLightbox((p) => (p !== null ? (p - 1 + images.length) % images.length : null));
  }, [images.length]);

  const nextLightbox = useCallback(() => {
    setZoomed(false);
    setLightbox((p) => (p !== null ? (p + 1) % images.length : null));
  }, [images.length]);

  useEffect(() => {
    if (lightbox === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") prevLightbox();
      if (e.key === "ArrowRight") nextLightbox();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, prevLightbox, nextLightbox]);

  // Prevent body scroll when lightbox open
  useEffect(() => {
    if (lightbox !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [lightbox]);

  if (images.length === 0) {
    return (
      <div className="aspect-square rounded-xl bg-muted flex items-center justify-center">
        <span className="text-6xl">📦</span>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {/* Main photo */}
        <div
          className="relative aspect-square rounded-xl overflow-hidden bg-muted group cursor-zoom-in"
          onClick={() => openLightbox(active)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[active]} alt={title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
            <div className="flex items-center gap-1.5 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
              <ZoomIn className="h-3.5 w-3.5" />
              Klik untuk memperbesar
            </div>
          </div>
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setActive((p) => (p - 1 + images.length) % images.length); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-opacity opacity-0 group-hover:opacity-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setActive((p) => (p + 1) % images.length); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-opacity opacity-0 group-hover:opacity-100"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {images.map((_, i) => (
                  <span key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === active ? "bg-white" : "bg-white/50"}`} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((src, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${i === active ? "border-primary" : "border-transparent hover:border-muted-foreground/40"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 md:p-10"
          onClick={closeLightbox}
        >
          {/* Modal container */}
          <div
            className="relative bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-w-4xl w-full max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header bar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
              <span className="text-white/60 text-sm">
                {images.length > 1 ? `${lightbox + 1} / ${images.length}` : title}
              </span>
              <button
                onClick={closeLightbox}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Image area */}
            <div
              className="relative flex items-center justify-center bg-black min-h-0 flex-1 overflow-hidden cursor-crosshair"
              onMouseEnter={() => setZoomed(true)}
              onMouseLeave={() => { setZoomed(false); setOrigin("50% 50%"); }}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                setOrigin(`${x}% ${y}%`);
              }}
            >
              {images.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); prevLightbox(); }}
                  className="absolute left-3 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              )}

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={images[lightbox]}
                alt={`${title} — foto ${lightbox + 1}`}
                className="max-w-full max-h-[70vh] object-contain"
                style={{
                  transform: zoomed ? "scale(2)" : "scale(1)",
                  transformOrigin: origin,
                  transition: zoomed ? "transform 0.3s ease" : "transform 0.2s ease",
                }}
              />

              {images.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); nextLightbox(); }}
                  className="absolute right-3 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              )}
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto px-4 py-3 border-t border-white/10">
                {images.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setLightbox(i)}
                    className={`shrink-0 w-14 h-14 rounded-md overflow-hidden border-2 transition-colors ${i === lightbox ? "border-white" : "border-transparent opacity-50 hover:opacity-80"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
