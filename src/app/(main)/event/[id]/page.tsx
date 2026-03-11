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
} from "lucide-react";
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

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      organizer: { select: { fullName: true, avatarUrl: true } },
      _count: { select: { tickets: { where: { paymentStatus: "PAID" } } } },
    },
  });

  if (!event || event.status === "CANCELLED") notFound();

  const soldCount = event._count.tickets;
  const quota = event.quota;
  const isPublicEvent = event.price === 0 && quota >= 999999;
  const availablePercent = Math.round((soldCount / quota) * 100);
  const isFull = soldCount >= quota;
  const isDeadlinePassed =
    event.registrationDeadline && new Date() > event.registrationDeadline;
  const canRegister = !isPublicEvent && !isFull && !isDeadlinePassed && event.status === "PUBLISHED";

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/event"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Event
      </Link>

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
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(new Date(event.eventDate), "EEEE, d MMMM yyyy", {
                    locale: id,
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(new Date(event.eventDate), "HH:mm 'WIB'")}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm col-span-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>
                  {event.location}
                  {event.address ? `, ${event.address}` : ""}
                </span>
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
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {event.description}
              </p>
            )}
          </div>

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
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <p className="text-2xl font-bold text-primary">
                  {formatPrice(event.price)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isPublicEvent ? "Terbuka untuk umum" : "per peserta"}
                </p>
              </div>

              {isPublicEvent ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2.5">
                  <Users className="h-4 w-4 shrink-0" />
                  <span>Tidak perlu mendaftar, langsung hadir di lokasi</span>
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {soldCount}/{quota} peserta
                      </span>
                      <span className="text-xs font-medium">
                        {quota - soldCount} slot tersisa
                      </span>
                    </div>
                    <Progress value={availablePercent} className="h-2" />
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
                    <Link href={`/event/${eventId}/daftar`}>
                      <Button className="w-full">
                        <Ticket className="h-4 w-4 mr-2" />
                        Daftar Sekarang
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
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Diselenggarakan oleh</p>
              <p className="font-medium text-sm">{event.organizer.fullName}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
