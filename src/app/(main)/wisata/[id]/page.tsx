import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, ExternalLink } from "lucide-react";
import { ShareButton } from "@/components/ShareButton";
import { wisataData } from "@/lib/wisata-data";

export default async function WisataDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const spot = wisataData.find((s) => s.id === id);
  if (!spot) notFound();

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-end mb-6">
        <ShareButton title={spot.name} text={`${spot.name} - Wisata Belitung Timur`} />
      </div>

      <div className="aspect-video rounded-xl bg-gradient-to-br from-teal-100 to-cyan-200 flex items-center justify-center mb-6">
        <span className="text-8xl">{spot.emoji}</span>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline">{spot.category}</Badge>
            {spot.highlight && <Badge className="bg-teal-600 text-white">{spot.highlight}</Badge>}
          </div>
          <h1 className="text-2xl font-bold">{spot.name}</h1>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
            <MapPin className="h-4 w-4" />
            {spot.location}
          </div>
        </div>

        <p className="text-muted-foreground leading-relaxed">{spot.description}</p>

        <a
          href={`https://www.google.com/maps/search/${encodeURIComponent(spot.name + " Belitung Timur")}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline" className="gap-2">
            <MapPin className="h-4 w-4" />
            Lihat di Google Maps
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </a>
      </div>
    </div>
  );
}
