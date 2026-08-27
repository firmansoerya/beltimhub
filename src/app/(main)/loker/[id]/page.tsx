export const revalidate = 60;

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MapPin, Banknote, Clock, Briefcase, Send, Pencil } from "lucide-react";
import { ShareButton } from "@/components/ShareButton";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

const typeColors: Record<string, string> = {
  "Full-time": "bg-blue-100 text-blue-700",
  "Part-time": "bg-purple-100 text-purple-700",
  "Freelance": "bg-orange-100 text-orange-700",
  "Magang": "bg-green-100 text-green-700",
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const job = await prisma.jobListing.findUnique({
    where: { id },
    select: { title: true, company: true, location: true, salary: true, type: true },
  });

  if (!job) {
    return { title: "Lowongan Tidak Ditemukan | BeltimHub" };
  }

  const description = [job.title, `di ${job.company}`, job.location, job.salary]
    .filter(Boolean)
    .join(" - ");

  return {
    title: `${job.title} di ${job.company} | Loker BeltimHub`,
    description,
    openGraph: {
      title: `${job.title} di ${job.company} | Loker BeltimHub`,
      description,
    },
  };
}

export default async function LokerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: jobId } = await params;
  const { userId } = await auth();

  const [job, currentUser] = await Promise.all([
    prisma.jobListing.findUnique({ where: { id: jobId }, include: { poster: { select: { fullName: true, nickname: true, isVerified: true } } } }),
    userId ? prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } }) : null,
  ]);

  if (!job || !job.isActive) notFound();

  const isOwner = !!currentUser && currentUser.id === job.posterId;

  const isWA = job.contact.startsWith("08") || job.contact.startsWith("+62") || /^\d{10,}$/.test(job.contact);
  const applyLink = isWA
    ? `https://wa.me/62${job.contact.replace(/^(0|\+62)/, "")}?text=Halo, saya tertarik melamar posisi ${job.title} di ${job.company}`
    : `mailto:${job.contact}`;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-end mb-6">
        <ShareButton title={job.title} text={`${job.title} di ${job.company}`} />
      </div>

      <div className="space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${typeColors[job.type] ?? "bg-gray-100 text-gray-700"}`}>
              {job.type}
            </span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold mb-1">{job.title}</h1>
              <p className="text-lg text-muted-foreground">{job.company}</p>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <span>Diposting oleh {job.poster.nickname ?? job.poster.fullName}</span>
                {job.poster.isVerified && <VerifiedBadge />}
              </div>
            </div>
            {isOwner && (
              <Link href={`/loker/${jobId}/edit`}>
                <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {job.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              {job.location}
            </div>
          )}
          {job.salary && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Banknote className="h-4 w-4 text-primary" />
              {job.salary}
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Briefcase className="h-4 w-4 text-primary" />
            {job.type}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 text-primary" />
            {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true, locale: id })}
          </div>
        </div>

        <Separator />

        <div>
          <h2 className="font-semibold mb-3">Deskripsi Pekerjaan</h2>
          {job.description.startsWith("<") ? (
            <div
              className="prose prose-sm max-w-none text-muted-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_strong]:text-foreground"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: job.description }}
            />
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{job.description}</p>
          )}
        </div>

        <Separator />

        <a href={applyLink} target="_blank" rel="noopener noreferrer">
          <Button size="lg" className="w-full gap-2">
            <Send className="h-4 w-4" />
            Lamar Sekarang
          </Button>
        </a>
      </div>
    </div>
  );
}
