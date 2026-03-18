export const revalidate = 60;

import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone, MapPin } from "lucide-react";

const UMKM_CATEGORIES = ["Semua", "Kuliner", "Fashion", "Kerajinan", "Pertanian", "Perikanan", "Jasa", "Teknologi", "Lainnya"];

async function UmkmGrid({ category, q }: { category?: string; q?: string }) {
  const where = {
    ...(category && category !== "Semua" ? { category } : {}),
    ...(q ? { OR: [
      { name: { contains: q, mode: "insensitive" as const } },
      { description: { contains: q, mode: "insensitive" as const } },
    ]} : {}),
  };

  const items = await prisma.umkm.findMany({
    where,
    orderBy: [{ isVerified: "desc" }, { createdAt: "desc" }],
    take: 20,
  });

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground col-span-full">
        Belum ada UMKM terdaftar untuk kategori ini.
      </div>
    );
  }

  return (
    <>
      {items.map((umkm) => (
        <Link key={umkm.id} href={`/umkm/${umkm.id}`}>
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
            <div className="aspect-video overflow-hidden rounded-t-lg bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
              {umkm.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={umkm.imageUrl} alt={umkm.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <span className="text-4xl">🏪</span>
              )}
            </div>
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Badge variant="outline" className="text-xs">{umkm.category}</Badge>
                {umkm.isVerified && <Badge className="text-xs bg-teal-600">✓ Terverifikasi</Badge>}
              </div>
              <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors line-clamp-1">{umkm.name}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{umkm.description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {umkm.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{umkm.address}</span>}
                {umkm.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{umkm.phone}</span>}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </>
  );
}

function UmkmSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <Skeleton className="aspect-video rounded-t-lg rounded-b-none" />
          <CardContent className="p-4 space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </CardContent>
        </Card>
      ))}
    </>
  );
}

export default async function UmkmPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const params = await searchParams;
  const category = params.category;
  const q = params.q;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <PageHeader page="umkm" />

      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {UMKM_CATEGORIES.map((cat) => (
          <Link key={cat} href={`/umkm${cat === "Semua" ? "" : `?category=${cat}`}`} className="shrink-0">
            <Badge
              variant={(cat === "Semua" && !category) || category === cat ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors px-3 py-1.5"
            >
              {cat}
            </Badge>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Suspense fallback={<UmkmSkeleton />}>
          <UmkmGrid category={category} q={q} />
        </Suspense>
      </div>
    </div>
  );
}
