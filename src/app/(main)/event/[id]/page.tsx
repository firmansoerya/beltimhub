import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  MapPin,
  Users,
  ArrowLeft,
  Clock,
  Ticket,
  CheckCircle,
  Mic2,
  ShieldCheck,
} from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { ShareButton } from "@/components/ShareButton";
import { format } from "date-fns";
import { id } from "date-fns/locale";

function formatPrice(price: number) {
  if (price === 0) return "Gratis";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}

// Tipe eksplisit untuk menghindari masalah inferensi unstable_cache dengan field Prisma baru
interface EventDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  coverImage: string | null;
  location: string;
  address: string | null;
  eventDate: Date;
  endDate: Date | null;
  registrationDeadline: Date | null;
  price: number;
  feeType: string;
  quota: number;
  registeredCount: number;
  status: string;
  package: string;
  requiresJersey: boolean;
  requiresBib: boolean;
  customFields: unknown;
  termsAndConditions: string | null;
  facilities: string[];
  lineUp: unknown;
  organizer: { fullName: string; avatarUrl: string | null; organizerLogoUrl: string | null; isVerified: boolean; instagramUsername: string | null; tiktokUsername: string | null; twitterUsername: string | null; facebookUrl: string | null };
  ticketCategories: { id: string; name: string; price: number; quota: number }[];
  _count: { tickets: number };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;
  const event = (await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      organizer: { select: { fullName: true, avatarUrl: true, organizerLogoUrl: true, isVerified: true, instagramUsername: true, tiktokUsername: true, twitterUsername: true, facebookUrl: true } },
      ticketCategories: { select: { id: true, name: true, price: true, quota: true }, orderBy: { sortOrder: "asc" } },
      _count: { select: { tickets: { where: { paymentStatus: "PAID" } } } },
    },
  })) as EventDetail | null;

  if (!event || event.status === "CANCELLED") notFound();

  const soldCount = event._count.tickets as number;
  const quota = event.quota;
  const isPublicEvent = event.price === 0 && quota >= 999999;
  const availablePercent = Math.round((soldCount / quota) * 100);
  const isFull = soldCount >= quota;
  const isDeadlinePassed =
    event.registrationDeadline && new Date() > event.registrationDeadline;
  const canRegister = !isPublicEvent && !isFull && !isDeadlinePassed && event.status === "PUBLISHED";
  const categories = event.ticketCategories ?? [];
  const minPrice = categories.length > 0
    ? Math.min(...categories.map((c) => c.price))
    : event.price;

  // Parse lineUp from JSON
  const lineUp = Array.isArray(event.lineUp)
    ? (event.lineUp as { name: string; role?: string }[])
    : [];

  // Format time range
  const startTime = format(new Date(event.eventDate), "HH:mm");
  const endTime = event.endDate ? format(new Date(event.endDate), "HH:mm") : null;
  const timeDisplay = endTime ? `${startTime} – ${endTime} WIB` : `${startTime} WIB`;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <Link href="/event" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Event
        </Link>
        <ShareButton title={event.title} />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="md:col-span-2 space-y-6">
          {event.coverImage ? (
            <div className="aspect-video rounded-xl overflow-hidden bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={event.coverImage}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="aspect-video rounded-xl bg-gradient-to-br from-primary/20 to-purple-200 flex items-center justify-center">
              <Ticket className="h-16 w-16 text-primary/40" />
            </div>
          )}

          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge variant="outline">{event.category}</Badge>
              {event.package !== "STARTER" && (
                <Badge className="bg-purple-600">{event.package}</Badge>
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
                <span>
                  {event.location}
                  {event.address ? `, ${event.address}` : ""}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Deskripsi */}
          <div>
            <h2 className="font-semibold mb-3">Tentang Event</h2>
            {event.description.startsWith("<") ? (
              <div
                className="prose prose-sm max-w-none text-muted-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_strong]:text-foreground"
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: event.description }}
              />
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {event.description}
              </p>
            )}
          </div>

          {/* Fasilitas */}
          {(event.facilities ?? []).length > 0 && (
            <>
              <Separator />
              <div>
                <h2 className="font-semibold mb-3">Fasilitas</h2>
                <div className="flex flex-wrap gap-2">
                  {event.facilities.map((f) => (
                    <span
                      key={f}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-muted border"
                    >
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Line-up */}
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
                      {person.role && (
                        <p className="text-xs text-muted-foreground mt-0.5">{person.role}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Atribut */}
          {(event.requiresJersey || event.requiresBib) && (
            <>
              <Separator />
              <div>
                <h2 className="font-semibold mb-3">Informasi Atribut</h2>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {event.requiresJersey && (
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Peserta mendapatkan Jersey
                    </li>
                  )}
                  {event.requiresBib && (
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Peserta mendapatkan BIB Number
                    </li>
                  )}
                </ul>
              </div>
            </>
          )}

          {/* Syarat & Ketentuan */}
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
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {event.termsAndConditions}
                  </p>
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
                  <div>
                    <Progress value={availablePercent} className="h-2" />
                    {isFull && (
                      <p className="text-xs font-semibold text-red-600 mt-1.5 flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                        Terjual Habis
                      </p>
                    )}
                  </div>

                  {event.registrationDeadline && (
                    <p className="text-xs text-muted-foreground">
                      Pendaftaran ditutup:{" "}
                      <span className="font-medium text-foreground">
                        {format(new Date(event.registrationDeadline), "d MMM yyyy", { locale: id })}
                      </span>
                    </p>
                  )}

                  {canRegister ? (
                    <Link href={`/event/${eventId}/beli`}>
                      <Button className="w-full">
                        <Ticket className="h-4 w-4 mr-2" />
                        Beli Tiket
                      </Button>
                    </Link>
                  ) : (
                    <Button className="w-full" disabled>
                      {isFull ? "Kuota Penuh" : isDeadlinePassed ? "Pendaftaran Ditutup" : "Tidak Tersedia"}
                    </Button>
                  )}
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
                  {/* Socmed icons */}
                  {(event.organizer.instagramUsername || event.organizer.tiktokUsername || event.organizer.twitterUsername || event.organizer.facebookUrl) && (
                    <div className="flex items-center gap-2 mt-1.5">
                      {event.organizer.instagramUsername && (
                        <a href={`https://instagram.com/${event.organizer.instagramUsername}`} target="_blank" rel="noopener noreferrer" title="Instagram" className="text-muted-foreground hover:text-foreground transition-colors">
                          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                        </a>
                      )}
                      {event.organizer.tiktokUsername && (
                        <a href={`https://tiktok.com/@${event.organizer.tiktokUsername}`} target="_blank" rel="noopener noreferrer" title="TikTok" className="text-muted-foreground hover:text-foreground transition-colors">
                          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z"/></svg>
                        </a>
                      )}
                      {event.organizer.twitterUsername && (
                        <a href={`https://twitter.com/${event.organizer.twitterUsername}`} target="_blank" rel="noopener noreferrer" title="Twitter/X" className="text-muted-foreground hover:text-foreground transition-colors">
                          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        </a>
                      )}
                      {event.organizer.facebookUrl && (
                        <a href={`https://facebook.com/${event.organizer.facebookUrl}`} target="_blank" rel="noopener noreferrer" title="Facebook" className="text-muted-foreground hover:text-foreground transition-colors">
                          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
