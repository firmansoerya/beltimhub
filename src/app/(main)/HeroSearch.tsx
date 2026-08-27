"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

const SUGGESTIONS = [
  "Pantai Burong Mandi",
  "Lowongan kerja di Manggar",
  "Festival Budaya Beltim",
  "UMKM kuliner lokal",
  "Wisata Danau Kaolin",
  "Warung kopi terbaik",
  "Batik Belitung motif terbaru",
  "Kerajinan tangan lokal",
];

export function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const indexRef = useRef(Math.floor(Math.random() * SUGGESTIONS.length));

  useEffect(() => {
    function typeSuggestion() {
      const target = SUGGESTIONS[indexRef.current % SUGGESTIONS.length];
      let i = 0;
      setPlaceholder("");
      timerRef.current = setInterval(() => {
        i++;
        setPlaceholder(target.slice(0, i));
        if (i >= target.length) {
          clearInterval(timerRef.current!);
          timerRef.current = setTimeout(() => {
            indexRef.current++;
            typeSuggestion();
          }, 8000);
        }
      }, 40);
    }
    typeSuggestion();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/cari?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <form onSubmit={handleSearch} className="max-w-xl mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder || "Cari di BeltimHub..."}
          className="w-full pl-12 pr-5 py-4 text-sm md:text-base rounded-full bg-white text-foreground shadow-lg border-0 focus:outline-none focus:ring-4 focus:ring-white/30 placeholder:text-muted-foreground/60 transition-shadow"
        />
      </div>
    </form>
  );
}
