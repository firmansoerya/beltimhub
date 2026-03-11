"use client";

import { useState, useEffect } from "react";
import { ArrowRight, Shuffle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { translations } from "@/lib/i18n";

function useLocale() {
  const [locale, setLocale] = useState<"id" | "en">("id");
  useEffect(() => {
    const saved = localStorage.getItem("locale");
    if (saved === "en") setLocale("en");
  }, []);
  return locale;
}

const LUCKY_DESTINATIONS = [
  { path: "/event", labelId: "Event", labelEn: "Events" },
  { path: "/fjb", labelId: "Jual Beli", labelEn: "Marketplace" },
  { path: "/berita", labelId: "Berita", labelEn: "News" },
  { path: "/wisata", labelId: "Wisata", labelEn: "Tourism" },
  { path: "/umkm", labelId: "UMKM", labelEn: "Businesses" },
  { path: "/loker", labelId: "Loker", labelEn: "Jobs" },
];

function LuckyButton({ buttonLabel }: { buttonLabel: string }) {
  const router = useRouter();
  const locale = useLocale();
  const [spinning, setSpinning] = useState(false);
  const [label, setLabel] = useState<string | null>(null);

  function handleLucky() {
    setSpinning(true);
    let count = 0;
    const interval = setInterval(() => {
      const random = LUCKY_DESTINATIONS[Math.floor(Math.random() * LUCKY_DESTINATIONS.length)];
      setLabel(locale === "en" ? random.labelEn : random.labelId);
      count++;
      if (count >= 8) {
        clearInterval(interval);
        const final = LUCKY_DESTINATIONS[Math.floor(Math.random() * LUCKY_DESTINATIONS.length)];
        setLabel(locale === "en" ? final.labelEn : final.labelId);
        setTimeout(() => router.push(final.path), 300);
      }
    }, 80);
  }

  return (
    <button
      onClick={handleLucky}
      disabled={spinning}
      className="inline-flex items-center gap-2 rounded-lg px-6 py-3 border border-border text-sm font-medium hover:bg-accent transition-colors disabled:opacity-70"
    >
      <Shuffle className={`w-4 h-4 ${spinning ? "animate-spin" : ""}`} />
      {label ? (
        <span className="font-mono text-primary min-w-[80px] text-left">{label}</span>
      ) : (
        buttonLabel
      )}
    </button>
  );
}

export function Error404({
  postcardImage = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=720&q=80&auto=format&fit=crop",
  postcardAlt = "Pantai Belitung",
  curvedTextTop = "BeltimHub",
  curvedTextBottom = "Belitung Timur",
  backButtonHref = "/",
}: {
  postcardImage?: string;
  postcardAlt?: string;
  curvedTextTop?: string;
  curvedTextBottom?: string;
  backButtonHref?: string;
}) {
  const locale = useLocale();
  const t = translations[locale].notFound;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="flex flex-col items-center">
        <div className="relative mb-16">
          <svg
            className="absolute -top-16 -left-12 w-[140px] h-[140px] pointer-events-none z-20"
            viewBox="0 0 140 140"
            style={{ animation: "spin-slow 20s linear infinite" }}
          >
            <defs>
              <path
                id="circlePath"
                d="M 70,70 m -50,0 a 50,50 0 1,1 100,0 a 50,50 0 1,1 -100,0"
                fill="transparent"
              />
            </defs>
            <text
              className="text-[11px] fill-foreground font-serif uppercase"
              style={{ fontWeight: 400, letterSpacing: "0.15em" }}
            >
              <textPath href="#circlePath" startOffset="0%">
                {curvedTextTop} • {curvedTextBottom} •
              </textPath>
            </text>
          </svg>

          <div className="relative z-10">
            <div className="relative p-3 shadow-2xl rotate-[4deg] hover:rotate-0 transition-transform duration-300 bg-white">
              <div className="relative overflow-hidden bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={postcardImage}
                  alt={postcardAlt}
                  className="w-[360px] h-[220px] object-cover"
                />
              </div>
            </div>

            <svg
              className="absolute -right-16 top-1/2 -translate-y-1/2 w-28 h-20"
              viewBox="0 0 100 60"
            >
              {[15, 25, 35].map((y) => (
                <path
                  key={y}
                  d={`M 10 ${y} Q 20 ${y - 5} 30 ${y} Q 40 ${y + 5} 50 ${y} Q 60 ${y - 5} 70 ${y} Q 80 ${y + 5} 90 ${y}`}
                  stroke="#888"
                  strokeWidth="1.5"
                  fill="none"
                  opacity="0.6"
                />
              ))}
            </svg>
          </div>
        </div>

        <div className="text-center max-w-2xl">
          <h1
            className="text-4xl md:text-5xl mb-6 text-balance leading-tight"
            style={{ fontFamily: "var(--font-doto)", fontWeight: 700 }}
          >
            {t.heading}
          </h1>
          <p className="text-muted-foreground text-base md:text-lg mb-10">
            {t.subtext}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href={backButtonHref}
              className="inline-flex items-center gap-2 rounded-lg px-6 py-3 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              {t.backButton}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <LuckyButton buttonLabel={t.luckyButton} />
          </div>
        </div>
      </div>
    </div>
  );
}
