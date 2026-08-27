"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MapPin, ChevronDown, Check } from "lucide-react";
import { KECAMATAN_BELTIM } from "@/lib/constants";

const ALL_LABEL = "Belitung Timur";

export function LocationFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("loc") ?? "";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function select(loc: string) {
    const sp = new URLSearchParams(searchParams.toString());
    if (loc) {
      sp.set("loc", loc);
    } else {
      sp.delete("loc");
    }
    sp.delete("page"); // reset page on location change
    router.push(`/fjb?${sp.toString()}`);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2.5 text-sm border rounded-lg bg-background hover:bg-muted/50 transition-colors min-w-0 w-full sm:w-auto"
      >
        <MapPin className="h-4 w-4 text-teal-600 shrink-0" />
        <span className="truncate font-medium">{current || ALL_LABEL}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 w-56 bg-background border rounded-xl shadow-lg z-50 overflow-hidden">
          <button
            onClick={() => select("")}
            className="flex items-center justify-between w-full px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              {ALL_LABEL}
            </span>
            {!current && <Check className="h-4 w-4 text-teal-600" />}
          </button>
          <div className="border-t" />
          {KECAMATAN_BELTIM.map((kec) => (
            <button
              key={kec}
              onClick={() => select(kec)}
              className="flex items-center justify-between w-full px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors"
            >
              <span className="pl-5.5">{kec}</span>
              {current === kec && <Check className="h-4 w-4 text-teal-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
