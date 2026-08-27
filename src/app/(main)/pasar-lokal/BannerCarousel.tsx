"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface BannerSlide {
  image: string;
  title?: string;
  subtitle?: string;
  href?: string;
}

const DEFAULT_SLIDES: BannerSlide[] = [
  {
    image: "",
    title: "Pasar Lokal",
    subtitle: "Belanja produk asli UMKM Belitung Timur — pembayaran aman, dana ditahan sampai barang diterima.",
  },
  {
    image: "",
    title: "Pembayaran Aman",
    subtitle: "Sistem escrow melindungi transaksi Anda — dana baru diteruskan setelah barang diterima.",
  },
  {
    image: "",
    title: "Produk UMKM Terverifikasi",
    subtitle: "Setiap toko telah diverifikasi untuk menjamin keaslian dan kualitas produk lokal.",
  },
];

export function BannerCarousel({ slides = DEFAULT_SLIDES }: { slides?: BannerSlide[] }) {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const total = slides.length;

  const goTo = useCallback((index: number) => {
    setCurrent(((index % total) + total) % total);
  }, [total]);

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  // Auto-play
  useEffect(() => {
    if (isPaused || total <= 1) return;
    timerRef.current = setInterval(next, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [next, isPaused, total]);

  // Touch swipe support
  const touchStartX = useRef(0);
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? next() : prev();
    }
  }

  const slide = slides[current];

  return (
    <div
      className="relative overflow-hidden bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slide content */}
      <div className="relative h-[180px] md:h-[220px]">
        {/* Background image if exists */}
        {slide.image && (
          <Image
            src={slide.image}
            alt={slide.title || "Banner"}
            fill
            sizes="100vw"
            className="object-cover"
            priority={current === 0}
          />
        )}

        {/* Overlay + text */}
        <div className={`absolute inset-0 flex items-center ${slide.image ? "bg-black/30" : ""}`}>
          <div className="container mx-auto max-w-6xl px-4">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
              {slide.title || "Pasar Lokal"}
            </h1>
            {slide.subtitle && (
              <p className="text-white/80 text-sm md:text-base max-w-lg">
                {slide.subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation arrows */}
      {total > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors"
            aria-label="Sebelumnya"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors"
            aria-label="Selanjutnya"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dots indicator */}
      {total > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current
                  ? "w-6 bg-white"
                  : "w-1.5 bg-white/50 hover:bg-white/70"
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
