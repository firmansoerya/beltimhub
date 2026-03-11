"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Newspaper, ShoppingBag, Calendar, Search, TreePalm, Store, Briefcase, Info } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const SUGGESTIONS_ID = [
  "Pantai Burong Mandi",
  "Lowongan kerja di Manggar",
  "Festival Budaya Beltim 2025",
  "UMKM kuliner Tanjung Pandan",
  "Wisata Danau Kaolin",
  "Honda Beat 2022 jual murah",
  "Info vaksinasi Belitung Timur",
  "Event lari Beltim Run",
  "Warung kopi terbaik di Manggar",
  "Loker guru SD Belitung Timur",
  "Snorkeling Pulau Lengkuas",
  "Batik Belitung motif terbaru",
  "Jadwal pasar malam Beltim",
  "UMKM kerajinan tangan lokal",
];

const SUGGESTIONS_EN = [
  "Burong Mandi Beach",
  "Job vacancies in Manggar",
  "Beltim Cultural Festival 2025",
  "Local culinary businesses",
  "Kaolin Lake tourism",
  "Used Honda Beat for sale",
  "East Belitung vaccination info",
  "Beltim Run marathon event",
  "Best coffee shops in Manggar",
  "Elementary school teacher vacancy",
  "Snorkeling at Lengkuas Island",
  "Latest Belitung batik collection",
  "Night market schedule Beltim",
  "Local handicraft businesses",
];

export default function HomePage() {
  const router = useRouter();
  const { t, locale } = useLanguage();
  const [query, setQuery] = useState("");
  const [displayed, setDisplayed] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const placeholderRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const placeholderIndexRef = useRef(0);

  // Typing effect for heading
  useEffect(() => {
    const headings = t.home.headings;
    const target = headings[Math.floor(Math.random() * headings.length)];
    let i = 0;
    setDisplayed("");
    const interval = setInterval(() => {
      i++;
      setDisplayed(target.slice(0, i));
      if (i >= target.length) clearInterval(interval);
    }, 40);
    return () => clearInterval(interval);
  }, [t]);

  // Rotating placeholder suggestion
  useEffect(() => {
    const suggestions = locale === "id" ? SUGGESTIONS_ID : SUGGESTIONS_EN;
    placeholderIndexRef.current = Math.floor(Math.random() * suggestions.length);

    function typeSuggestion() {
      const suggestions = locale === "id" ? SUGGESTIONS_ID : SUGGESTIONS_EN;
      const target = suggestions[placeholderIndexRef.current % suggestions.length];
      let i = 0;
      setPlaceholder("");

      placeholderRef.current = setInterval(() => {
        i++;
        setPlaceholder(target.slice(0, i));
        if (i >= target.length) {
          clearInterval(placeholderRef.current!);
          // Pause, then move to next suggestion
          placeholderRef.current = setTimeout(() => {
            placeholderIndexRef.current++;
            typeSuggestion();
          }, 10000);
        }
      }, 35);
    }

    typeSuggestion();
    return () => {
      if (placeholderRef.current) clearInterval(placeholderRef.current);
    };
  }, [locale]);

  function handleSearch(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/cari?q=${encodeURIComponent(query.trim())}`);
  }

  const shortcuts = [
    { href: "/berita", label: t.home.shortcutNews, icon: Newspaper, color: "text-blue-500" },
    { href: "/fjb", label: t.home.shortcutFJB, icon: ShoppingBag, color: "text-green-500" },
    { href: "/event", label: t.home.shortcutEvent, icon: Calendar, color: "text-purple-500" },
    { href: "/wisata", label: "Wisata", icon: TreePalm, color: "text-teal-500" },
    { href: "/umkm", label: "UMKM", icon: Store, color: "text-orange-500" },
    { href: "/loker", label: "Loker", icon: Briefcase, color: "text-red-500" },
    { href: "/info", label: "Info", icon: Info, color: "text-slate-500" },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-4">
      {/* Heading */}
      <div className="mb-8 text-center">
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase mb-3">
          {t.home.welcome}
        </p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground min-h-[2.5rem]">
          {displayed}
        </h1>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="w-full max-w-2xl">
        <div className="relative flex items-center">
          <Search className="absolute left-4 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-11 pr-4 py-3.5 text-sm rounded-full border border-input bg-background shadow-sm hover:shadow-md focus:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
          />
        </div>
      </form>

      {/* Shortcuts */}
      <div className="flex flex-wrap justify-center gap-2 mt-6">
        {shortcuts.map(({ href, label, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-muted-foreground rounded-full border border-transparent hover:border-border hover:bg-muted/50 transition-colors"
          >
            <Icon className={`h-3.5 w-3.5 ${color}`} />
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
