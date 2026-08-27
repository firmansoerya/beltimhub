"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, X, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface NewsFilterBarProps {
  categories: string[];
  activeCategory?: string;
  searchQuery?: string;
}

export function NewsFilterBar({
  categories,
  activeCategory,
  searchQuery = "",
}: NewsFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchQuery);
  const [isPending, startTransition] = useTransition();

  const handleCategoryClick = (category: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page"); // Reset page when category changes

    if (category === "Semua") {
      params.delete("source");
    } else {
      params.set("source", category);
    }

    startTransition(() => {
      router.push(`/berita?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");

    if (query.trim()) {
      params.set("q", query.trim());
    } else {
      params.delete("q");
    }

    startTransition(() => {
      router.push(`/berita?${params.toString()}`);
    });
  };

  const handleClearSearch = () => {
    setQuery("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    params.delete("q");

    startTransition(() => {
      router.push(`/berita?${params.toString()}`);
    });
  };

  const currentCategory = activeCategory || "Semua";

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-3 sm:p-4 shadow-sm mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category horizontal scrollable tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0 scroll-smooth">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => handleCategoryClick("Semua")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                currentCategory === "Semua"
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                  : "bg-muted/80 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Semua
            </button>

            {categories.map((cat) => {
              const isActive = currentCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategoryClick(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                      : "bg-muted/80 text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Bar */}
        <form
          onSubmit={handleSearchSubmit}
          className="relative flex items-center min-w-[240px] lg:min-w-[280px]"
        >
          <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari berita seputar Beltim..."
            className="pl-9 pr-16 h-9 text-xs sm:text-sm rounded-full bg-background border-border/80 focus-visible:ring-primary/20"
          />
          {query && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-9 text-muted-foreground hover:text-foreground p-1 transition-colors"
              title="Hapus pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={isPending}
            className="absolute right-1 h-7 px-2.5 rounded-full text-xs font-medium"
          >
            Cari
          </Button>
        </form>
      </div>
    </div>
  );
}
