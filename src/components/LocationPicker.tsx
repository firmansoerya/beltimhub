"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, MapPin, Loader2, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Fix ikon Leaflet bawaan yang hilang di Next.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Belitung Timur center
const DEFAULT_LAT = -2.8789;
const DEFAULT_LNG = 108.2689;

export interface SelectedLocation {
  lat: number;
  lng: number;
  address: string;
  mapsUrl: string;
}

interface Props {
  initialAddress?: string;
  onSelect: (loc: SelectedLocation) => void;
}

export function LocationPicker({ initialAddress, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [searchInput, setSearchInput] = useState(initialAddress ?? "");
  const [searching, setSearching] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  // Init map sekali saja
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView([DEFAULT_LAT, DEFAULT_LNG], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    map.on("click", async (e) => {
      const { lat, lng } = e.latlng;
      placeMarker(map, lat, lng);

      // Reverse geocode
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=id`
        );
        const data = await res.json();
        const addr: string = data.display_name ?? `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        setInfo(addr);
        setSearchInput(addr);
        onSelect({ lat, lng, address: addr, mapsUrl: `https://www.google.com/maps?q=${lat},${lng}` });
      } catch {
        const coords = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        setInfo(coords);
        onSelect({ lat, lng, address: coords, mapsUrl: `https://www.google.com/maps?q=${lat},${lng}` });
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function placeMarker(map: L.Map, lat: number, lng: number) {
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
      markerRef.current.on("dragend", async () => {
        const pos = markerRef.current!.getLatLng();
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.lat}&lon=${pos.lng}&format=json&accept-language=id`
          );
          const data = await res.json();
          const addr: string = data.display_name ?? `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`;
          setInfo(addr);
          setSearchInput(addr);
          onSelect({ lat: pos.lat, lng: pos.lng, address: addr, mapsUrl: `https://www.google.com/maps?q=${pos.lat},${pos.lng}` });
        } catch {
          const coords = `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`;
          setInfo(coords);
          onSelect({ lat: pos.lat, lng: pos.lng, address: coords, mapsUrl: `https://www.google.com/maps?q=${pos.lat},${pos.lng}` });
        }
      });
    }
  }

  async function geocodeSearch() {
    if (!searchInput.trim() || !mapRef.current) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchInput)}&format=json&limit=1&accept-language=id`
      );
      const results = await res.json();
      if (!results.length) {
        setInfo("Lokasi tidak ditemukan, coba kata kunci lain");
        return;
      }
      const { lat, lon, display_name } = results[0];
      const numLat = parseFloat(lat);
      const numLng = parseFloat(lon);
      mapRef.current.setView([numLat, numLng], 16);
      placeMarker(mapRef.current, numLat, numLng);
      setInfo(display_name);
      onSelect({ lat: numLat, lng: numLng, address: display_name, mapsUrl: `https://www.google.com/maps?q=${numLat},${numLng}` });
    } catch {
      setInfo("Gagal mencari lokasi");
    } finally {
      setSearching(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      mapRef.current!.setView([lat, lng], 16);
      placeMarker(mapRef.current!, lat, lng);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=id`
        );
        const data = await res.json();
        const addr: string = data.display_name ?? `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        setInfo(addr);
        setSearchInput(addr);
        onSelect({ lat, lng, address: addr, mapsUrl: `https://www.google.com/maps?q=${lat},${lng}` });
      } catch {
        const coords = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        onSelect({ lat, lng, address: coords, mapsUrl: `https://www.google.com/maps?q=${lat},${lng}` });
      }
    });
  }

  return (
    <div className="space-y-2">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center border rounded-md px-2.5 bg-background">
          <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mr-2" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), geocodeSearch())}
            placeholder="Cari alamat di peta..."
            className="border-0 p-0 h-9 focus-visible:ring-0 text-sm"
          />
        </div>
        <Button type="button" variant="outline" size="icon" onClick={geocodeSearch} disabled={searching} className="shrink-0">
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
        <Button type="button" variant="outline" size="icon" onClick={useMyLocation} className="shrink-0" title="Gunakan lokasi saya">
          <Navigation className="h-4 w-4" />
        </Button>
      </div>

      {/* Peta */}
      <div ref={containerRef} className="rounded-lg overflow-hidden border" style={{ height: 280 }} />

      {/* Info lokasi terpilih */}
      {info && (
        <p className="text-xs text-muted-foreground flex items-start gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
          <span className="line-clamp-2">{info}</span>
        </p>
      )}
      <p className="text-xs text-muted-foreground">Klik di peta untuk menentukan lokasi, atau drag marker untuk menyesuaikan</p>
    </div>
  );
}
