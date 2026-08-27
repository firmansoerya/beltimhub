"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowRight, Store, Calendar, ChevronLeft, ChevronRight } from "lucide-react";

const CTA_SLIDES = [
  {
    icon: Store,
    gradient: "from-teal-600 to-teal-700",
    title: "Punya UMKM di Belitung Timur?",
    subtitle: "Daftarkan usahamu dan jangkau lebih banyak pelanggan melalui Pasar Lokal BeltimHub.",
    primary: { label: "Daftarkan UMKM", href: "/umkm/tambah" },
    secondary: { label: "Jelajahi Pasar Lokal", href: "/pasar-lokal" },
  },
  {
    icon: Calendar,
    gradient: "from-purple-600 to-indigo-700",
    title: "Punya event di Belitung Timur?",
    subtitle: "Buat event dan jual tiket langsung ke komunitas Beltim — mudah, cepat, dan terintegrasi.",
    primary: { label: "Buat Event", href: "/event/buat" },
    secondary: { label: "Lihat Event", href: "/event" },
  },
];

export function CtaCarousel() {
  const [current, setCurrent] = useState(0);
  const total = CTA_SLIDES.length;

  const next = useCallback(() => setCurrent((c) => (c + 1) % total), [total]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + total) % total), [total]);

  useEffect(() => {
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next]);

  const slide = CTA_SLIDES[current];
  const Icon = slide.icon;

  return (
    <div className="relative group">
      <div className={`bg-gradient-to-r ${slide.gradient} rounded-2xl p-8 md:p-12 text-center text-white transition-all duration-500`}>
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center">
            <Icon className="w-6 h-6" />
          </div>
        </div>
        <h2 className="text-xl md:text-2xl font-bold mb-2">
          {slide.title}
        </h2>
        <p className="text-white/80 text-sm md:text-base mb-6 max-w-md mx-auto">
          {slide.subtitle}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href={slide.primary.href}
            className="inline-flex items-center gap-2 bg-white text-gray-800 font-semibold px-6 py-2.5 rounded-full text-sm hover:bg-white/90 transition-colors"
          >
            {slide.primary.label}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href={slide.secondary.href}
            className="inline-flex items-center gap-2 bg-white/15 text-white font-semibold px-6 py-2.5 rounded-full text-sm hover:bg-white/25 transition-colors border border-white/20"
          >
            {slide.secondary.label}
          </Link>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-1.5 mt-6">
          {CTA_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/60"
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Arrows */}
      <button
        onClick={prev}
        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
        aria-label="Sebelumnya"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={next}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
        aria-label="Selanjutnya"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
