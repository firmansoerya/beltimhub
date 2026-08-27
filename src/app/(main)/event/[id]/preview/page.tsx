import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Calendar, MapPin, Users, Clock, Ticket,
  CheckCircle, Mic2, ShieldCheck,
} from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { PreviewBanner } from "./PreviewBanner";

function formatPrice(price: number) {
  if (price === 0) return "Gratis";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);
}

export default async function EventPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id: eventId } = await params;

  const [user, event] = await Promise.all([
    prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true, role: true } }),
    prisma.event.findUnique({
      where: { id: eventId },
      include: {
        organizer: {
          select: {
            id: true, fullName: true, avatarUrl: true, organizerLogoUrl: true,
            isVerified: true, instagramUsername: true, tiktokUsername: true,
            twitterUsername: true, facebookUrl: true,
          },
        },
        ticketCategories: { select: { id: true, name: true, price: true, quota: true }, orderBy: { sortOrder: "asc" } },
        _count: { select: { tickets: { where: { paymentStatus: "PAID" } } } },
      },
    }),
  ]);

  if (!user || !event) notFound();

  // Hanya organizer event ini atau admin yang bisa preview
  if (event.organizer.id !== user.id && user.role !== "ADMIN") redirect("/dashboard/organizer");

  const soldCount = event._count.tickets as number;
  const isPublicEvent = event.price === 0 && event.quota >= 999999;
  const categories = event.ticketCategories ?? [];
  const minPrice = categories.length > 0 ? Math.min(...categories.map(c => c.price)) : event.price;

  const lineUp = Array.isArray(event.lineUp)
    ? (event.lineUp as { name: string; role?: string }[])
    : [];

  const startTime = format(new Date(event.eventDate), "HH:mm");
  const endTime = event.endDate ? format(new Date(event.endDate), "HH:mm") : null;
  const timeDisplay = endTime ? `${startTime} – ${endTime} WIB` : `${startTime} WIB`;

  return (
    <div>
      <PreviewBanner eventId={eventId} />

      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="md:col-span-2 space-y-6">
            {event.coverImage ? (
              <div className="aspect-video rounded-xl overflow-hidden bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={event.coverImage} alt={event.title} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="aspect-video rounded-xl bg-gradient-to-br from-primary/20 to-purple-200 flex items-center justify-center">
                <Ticket className="h-16 w-16 text-primary/40" />
              </div>
            )}

            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant="outline">{event.category}</Badge>
                {event.status === "DRAFT" && (
                  <Badge className="bg-muted text-muted-foreground border">Draft</Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold mb-4">{event.title}</h1>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>
                    {format(new Date(event.eventDate), "EEEE, d MMMM yyyy", { locale: id })}
                    {event.endDate &&
                      new Date(event.endDate).toDateString() !== new Date(event.eventDate).toDateString() &&
                      ` – ${format(new Date(event.endDate), "d MMMM yyyy", { locale: id })}`}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{timeDisplay}</span>
                </div>
                <div className="flex items-center gap-2 text-sm col-span-2">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{event.location}{event.address ? `, ${event.address}` : ""}</span>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h2 className="font-semibold mb-3">Tentang Event</h2>
              {event.description.startsWith("<") ? (
                <div
                  className="prose prose-sm max-w-none text-muted-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_strong]:text-foreground"
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: event.description }}
                />
              ) : (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{event.description}</p>
              )}
            </div>

            {(event.facilities ?? []).length > 0 && (
              <>
                <Separator />
                <div>
                  <h2 className="font-semibold mb-3">Fasilitas</h2>
                  <div className="flex flex-wrap gap-2">
                    {event.facilities.map(f => (
                      <span key={f} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-muted border">
                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />{f}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

            {lineUp.length > 0 && (
              <>
                <Separator />
                <div>
                  <h2 className="font-semibold mb-3 flex items-center gap-2">
                    <Mic2 className="h-4 w-4 text-muted-foreground" />
                    Line-up / Narasumber
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {lineUp.map((person, i) => (
                      <div key={i} className="rounded-lg border bg-muted/30 px-4 py-3 text-center">
                        <p className="font-medium text-sm">{person.name}</p>
                        {person.role && <p className="text-xs text-muted-foreground mt-0.5">{person.role}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {(event.requiresJersey || event.requiresBib) && (
              <>
                <Separator />
                <div>
                  <h2 className="font-semibold mb-3">Informasi Atribut</h2>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {event.requiresJersey && <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" />Peserta mendapatkan Jersey</li>}
                    {event.requiresBib && <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" />Peserta mendapatkan BIB Number</li>}
                  </ul>
                </div>
              </>
            )}

            {event.termsAndConditions && (
              <>
                <Separator />
                <div>
                  <h2 className="font-semibold mb-3 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    Syarat & Ketentuan
                  </h2>
                  {event.termsAndConditions.startsWith("<") ? (
                    <div
                      className="prose prose-sm max-w-none text-muted-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_strong]:text-foreground"
                      // eslint-disable-next-line react/no-danger
                      dangerouslySetInnerHTML={{ __html: event.termsAndConditions }}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{event.termsAndConditions}</p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  {isPublicEvent ? (
                    <p className="text-lg font-bold text-green-600">Gratis</p>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground mb-0.5">Harga mulai dari</p>
                      <p className="text-2xl font-bold text-primary">{formatPrice(minPrice)}</p>
                    </>
                  )}
                </div>

                {isPublicEvent ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2.5">
                    <Users className="h-4 w-4 shrink-0" />
                    <span>Tidak perlu mendaftar, langsung hadir di lokasi</span>
                  </div>
                ) : (
                  <>
                    <div className="text-xs text-muted-foreground">
                      {soldCount}/{event.quota} peserta terdaftar
                    </div>
                    {event.registrationDeadline && (
                      <p className="text-xs text-muted-foreground">
                        Pendaftaran ditutup:{" "}
                        <span className="font-medium text-foreground">
                          {format(new Date(event.registrationDeadline), "d MMM yyyy", { locale: id })}
                        </span>
                      </p>
                    )}
                    <Button className="w-full" disabled>
                      <Ticket className="h-4 w-4 mr-2" />
                      Beli Tiket
                    </Button>
                    <p className="text-[11px] text-center text-muted-foreground">
                      Tombol aktif setelah event dipublikasikan
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-xs text-muted-foreground">Penyelenggara</p>
                <div className="flex items-center gap-3">
                  {(event.organizer.organizerLogoUrl ?? event.organizer.avatarUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={(event.organizer.organizerLogoUrl ?? event.organizer.avatarUrl)!}
                      alt={event.organizer.fullName}
                      className="h-12 w-12 rounded-full object-cover border border-border shrink-0"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-muted border border-border shrink-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-muted-foreground">{event.organizer.fullName[0]?.toUpperCase()}</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="font-semibold text-sm truncate">{event.organizer.fullName}</p>
                      {event.organizer.isVerified && <VerifiedBadge size="sm" />}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
