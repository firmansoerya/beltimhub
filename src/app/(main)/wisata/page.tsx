import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import { wisataData } from "@/lib/wisata-data";
import { PageHeader } from "@/components/layout/PageHeader";

const CATEGORIES = ["Semua", "Pantai", "Danau", "Alam", "Budaya", "Kuliner"];

import { isFeatureEnabled } from "@/lib/site-settings";
import { FeatureDisabledNotice } from "@/components/FeatureDisabledNotice";

export default async function WisataPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const isEnabled = await isFeatureEnabled("wisata");
  if (!isEnabled) {
    return <FeatureDisabledNotice featureName="Destinasi Wisata" />;
  }

  const params = await searchParams;
  const category = params.category;

  const filtered = category && category !== "Semua"
    ? wisataData.filter((s) => s.category === category)
    : wisataData;

  return (
    <div className="min-h-screen bg-muted/30">
      <PageHeader page="wisata" />

      <div className="container mx-auto max-w-6xl px-4 py-6">
      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {CATEGORIES.map((cat) => (
          <Link key={cat} href={`/wisata${cat === "Semua" ? "" : `?category=${cat}`}`} className="shrink-0">
            <Badge
              variant={(cat === "Semua" && !category) || category === cat ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors px-3 py-1.5"
            >
              {cat}
            </Badge>
          </Link>
        ))}
      </div>

      {/* Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((spot) => (
          <Link key={spot.id} href={`/wisata/${spot.id}`}>
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group overflow-hidden">
              <div className="aspect-video bg-gradient-to-br from-teal-100 to-cyan-200 flex items-center justify-center relative">
                <span className="text-6xl">{spot.emoji}</span>
                {spot.highlight && (
                  <Badge className="absolute top-3 left-3 bg-teal-600 text-white text-xs">
                    {spot.highlight}
                  </Badge>
                )}
              </div>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">{spot.category}</Badge>
                </div>
                <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">
                  {spot.name}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                  {spot.description}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {spot.location}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground col-span-full">
            Tidak ada destinasi wisata untuk kategori ini.
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
