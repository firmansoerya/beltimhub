"use client";

import dynamic from "next/dynamic";

export type { SelectedLocation } from "./LocationPicker";

export const LocationPickerDynamic = dynamic(
  () => import("./LocationPicker").then((m) => m.LocationPicker),
  {
    ssr: false,
    loading: () => (
      <div className="h-[280px] rounded-lg border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground animate-pulse">
        Memuat peta...
      </div>
    ),
  }
);
