"use client";

import { useRouter, useSearchParams } from "next/navigation";

const SORT_OPTIONS = [
  { value: "newest", label: "Terbaru" },
  { value: "cheapest", label: "Termurah" },
  { value: "expensive", label: "Termahal" },
  { value: "bestseller", label: "Terlaris" },
];

export function SortSelect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("sort") ?? "newest";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "newest") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }
    params.delete("page"); // reset halaman saat ganti sort
    const qs = params.toString();
    router.push(`/pasar-lokal${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Urutkan</span>
      <select
        value={current}
        onChange={(e) => handleChange(e.target.value)}
        className="text-sm font-medium border rounded-md px-2.5 py-1.5 bg-background cursor-pointer outline-none focus:ring-2 focus:ring-ring"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
