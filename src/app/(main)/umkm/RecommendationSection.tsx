"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Store, Star, ShieldCheck, Heart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface UmkmItem {
  id: string;
  name: string;
  imageUrl: string | null;
  category: string;
  isVerified: boolean;
  _count: { reviews: number };
}

function UmkmCard({ umkm }: { umkm: UmkmItem }) {
  return (
    <Link href={`/umkm/${umkm.id}`} className="group">
      <div className="bg-white dark:bg-card border rounded-xl overflow-hidden hover:shadow-md transition-shadow text-center p-4">
        <div className="relative w-16 h-16 mx-auto rounded-full overflow-hidden bg-muted ring-2 ring-teal-100">
          {umkm.imageUrl ? (
            <Image src={umkm.imageUrl} alt={umkm.name} fill className="object-cover" sizes="64px" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-50 to-teal-100">
              <Store className="w-6 h-6 text-teal-300" />
            </div>
          )}
        </div>
        <h3 className="font-semibold text-xs mt-3 line-clamp-1 group-hover:text-teal-600 transition-colors">
          {umkm.name}
        </h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">{umkm.category}</p>
        {umkm._count.reviews > 0 && (
          <div className="flex items-center justify-center gap-0.5 mt-1">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-[10px] text-muted-foreground">{umkm._count.reviews} ulasan</span>
          </div>
        )}
        {umkm.isVerified && (
          <div className="flex items-center justify-center gap-0.5 mt-1">
            <ShieldCheck className="w-3 h-3 text-teal-500" />
            <span className="text-[10px] text-teal-600 font-medium">Terverifikasi</span>
          </div>
        )}
      </div>
    </Link>
  );
}

function RecSkeleton() {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-card border rounded-xl p-4 text-center">
          <Skeleton className="w-16 h-16 rounded-full mx-auto" />
          <Skeleton className="h-3 w-16 mx-auto mt-3" />
          <Skeleton className="h-2.5 w-12 mx-auto mt-1.5" />
        </div>
      ))}
    </div>
  );
}

export function RecommendationSection() {
  const [items, setItems] = useState<UmkmItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/umkm/recommendations")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setItems(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && items.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-teal-600" />
          <h2 className="text-lg font-bold">Rekomendasi Untukmu</h2>
        </div>
      </div>
      {loading ? <RecSkeleton /> : (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {items.map((u) => <UmkmCard key={u.id} umkm={u} />)}
        </div>
      )}
    </section>
  );
}
