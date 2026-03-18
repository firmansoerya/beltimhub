"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";

interface Props {
  query: string; // alamat teks atau koordinat
}

export function MapPreview({ query }: Props) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    if (!query || query.trim().length < 5) {
      setSrc("");
      return;
    }
    const timer = setTimeout(() => {
      setSrc(
        `https://maps.google.com/maps?q=${encodeURIComponent(query.trim())}&output=embed&hl=id&z=15`
      );
    }, 900);
    return () => clearTimeout(timer);
  }, [query]);

  if (!src) {
    return (
      <div className="mt-2 flex items-center justify-center gap-2 h-40 rounded-lg border-2 border-dashed border-border bg-muted/30 text-muted-foreground text-xs">
        <MapPin className="h-4 w-4" />
        Ketik alamat untuk melihat peta
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-lg overflow-hidden border h-48">
      <iframe
        src={src}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="Peta Lokasi"
      />
    </div>
  );
}
