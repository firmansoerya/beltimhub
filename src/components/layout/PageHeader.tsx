"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type PageKey = "berita" | "fjb" | "event" | "wisata" | "umkm" | "loker";

interface PageHeaderProps {
  page: PageKey;
}

export function PageHeader({ page }: PageHeaderProps) {
  const { t } = useLanguage();
  const data = t.pages[page];

  const action =
    page === "fjb"
      ? { label: (data as typeof t.pages.fjb).postAd, href: "/fjb/buat" }
      : page === "event"
        ? { label: (data as typeof t.pages.event).createEvent, href: "/event/buat" }
        : page === "umkm"
          ? { label: (data as typeof t.pages.umkm).register, href: "/umkm/tambah" }
          : page === "loker"
            ? { label: (data as typeof t.pages.loker).postJob, href: "/loker/buat" }
            : null;

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">{data.title}</h1>
        <p className="text-muted-foreground text-sm">{data.subtitle}</p>
      </div>
      {action && (
        <Link href={action.href}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {action.label}
          </Button>
        </Link>
      )}
    </div>
  );
}
