export const revalidate = 60;

import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Clock, Banknote, Briefcase } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";

const JOB_TYPES = ["Semua", "Full-time", "Part-time", "Freelance", "Magang"];

async function JobGrid({ type, q, page }: { type?: string; q?: string; page: number }) {
  const limit = 18;
  const where = {
    isActive: true,
    ...(type && type !== "Semua" ? { type } : {}),
    ...(q ? { OR: [
      { title: { contains: q, mode: "insensitive" as const } },
      { company: { contains: q, mode: "insensitive" as const } },
      { description: { contains: q, mode: "insensitive" as const } },
    ]} : {}),
  };

  const [items, total] = await Promise.all([
    prisma.jobListing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        poster: { select: { fullName: true, nickname: true, isVerified: true } },
      },
    }),
    prisma.jobListing.count({ where }),
  ]);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Briefcase}
        title="Belum ada lowongan"
        description="Belum ada lowongan untuk kategori ini"
        actionLabel="Pasang Lowongan"
        actionHref="/loker/buat"
      />
    );
  }

  const totalPages = Math.ceil(total / limit);
  const typeColors: Record<string, string> = {
    "Full-time": "bg-blue-100 text-blue-700",
    "Part-time": "bg-purple-100 text-purple-700",
    "Freelance": "bg-orange-100 text-orange-700",
    "Magang": "bg-green-100 text-green-700",
  };

  function buildHref(p: number) {
    const sp = new URLSearchParams();
    sp.set("page", String(p));
    if (type && type !== "Semua") sp.set("type", type);
    if (q) sp.set("q", q);
    return `/loker?${sp.toString()}`;
  }

  return (
    <>
      {items.map((job) => (
        <Link key={job.id} href={`/loker/${job.id}`}>
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-sm group-hover:text-primary transition-colors mb-1">
                    {job.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{job.company}</p>
                </div>
                <span className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${typeColors[job.type] ?? "bg-gray-100 text-gray-700"}`}>
                  {job.type}
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                {job.location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {job.location}
                  </div>
                )}
                {job.salary && (
                  <div className="flex items-center gap-1.5">
                    <Banknote className="h-3.5 w-3.5" />
                    {job.salary}
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true, locale: id })}
                </div>
                <div className="flex items-center gap-1">
                  <span>Oleh {job.poster.nickname ?? job.poster.fullName}</span>
                  {job.poster.isVerified && <VerifiedBadge />}
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
      <div className="col-span-full">
        <Pagination currentPage={page} totalPages={totalPages} buildHref={buildHref} />
      </div>
    </>
  );
}

function JobSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-5 space-y-3">
            <div className="flex justify-between">
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </CardContent>
        </Card>
      ))}
    </>
  );
}

import { isFeatureEnabled } from "@/lib/site-settings";
import { FeatureDisabledNotice } from "@/components/FeatureDisabledNotice";

export default async function LokerPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string; page?: string }>;
}) {
  const isEnabled = await isFeatureEnabled("loker");
  if (!isEnabled) {
    return <FeatureDisabledNotice featureName="Lowongan Kerja (Loker)" />;
  }

  const params = await searchParams;
  const type = params.type;
  const q = params.q;
  const page = parseInt(params.page ?? "1");

  return (
    <div className="min-h-screen bg-muted/30">
      <PageHeader page="loker" />

      <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar">
        {JOB_TYPES.map((t) => (
          <Link key={t} href={`/loker${t === "Semua" ? "" : `?type=${t}`}`} className="shrink-0">
            <Badge
              variant={(t === "Semua" && !type) || type === t ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors px-3 py-1.5"
            >
              {t}
            </Badge>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Suspense fallback={<JobSkeleton />}>
          <JobGrid type={type} q={q} page={page} />
        </Suspense>
      </div>
      </div>
    </div>
  );
}
