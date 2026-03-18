export const revalidate = 60;

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MapPin, Clock, User, Star, ArrowLeft, MessageCircle, TrendingUp } from "lucide-react";
import { ShareButton } from "@/components/ShareButton";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { ImageGallery } from "./ImageGallery";
import { FjbOwnerActions } from "./FjbOwnerActions";
import { PriceOfferButton } from "./PriceOfferModal";

function formatPrice(price: number) {
  if (price === 0) return "Gratis";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: listingId } = await params;
  const { userId } = await auth();

  const [listing, currentUser] = await Promise.all([
    prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        seller: { select: { fullName: true, nickname: true, avatarUrl: true, phoneNumber: true, isVerified: true } },
        _count: { select: { priceOffers: true } },
      },
    }),
    userId ? prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } }) : null,
  ]);

  if (!listing || listing.status === "DELETED") notFound();

  const isOwner = !!currentUser && currentUser.id === listing.sellerId;

  const waLink = listing.seller.phoneNumber
    ? `https://wa.me/62${listing.seller.phoneNumber.replace(/^0/, "")}?text=Halo, saya tertarik dengan iklan "${listing.title}" di BeltimHub (beltim.id)`
    : null;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <Link href="/fjb" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Kembali ke FJB
        </Link>
        <ShareButton title={listing.title} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Images */}
        <div>
          <ImageGallery images={listing.images ?? []} title={listing.title} />
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div>
            {listing.isPremium && (
              <Badge className="mb-2 bg-amber-500 gap-1">
                <Star className="h-3 w-3" />
                Iklan Unggulan
              </Badge>
            )}
            <Badge variant="outline" className="mb-2 ml-2">
              {listing.category}
            </Badge>
            <h1 className="text-xl font-bold">{listing.title}</h1>
            <p className="text-2xl font-bold text-primary mt-1">
              {formatPrice(listing.price)}
            </p>
            {listing._count.priceOffers >= 2 && (
              <p className="flex items-center gap-1.5 text-xs text-amber-600 mt-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                {listing._count.priceOffers} orang sudah menawar barang ini
              </p>
            )}
            {isOwner && (
              <div className="mt-3">
                <FjbOwnerActions id={listing.id} status={listing.status} />
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {listing.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {listing.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatDistanceToNow(new Date(listing.createdAt), {
                addSuffix: true,
                locale: id,
              })}
            </span>
          </div>

          <Separator />

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  {listing.seller.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={listing.seller.avatarUrl}
                      alt={listing.seller.nickname ?? listing.seller.fullName}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <p className="font-medium text-sm">{listing.seller.nickname ?? listing.seller.fullName}</p>
                    {listing.seller.isVerified && <VerifiedBadge />}
                  </div>
                  <p className="text-xs text-muted-foreground">Penjual</p>
                </div>
              </div>
              {waLink && (
                <a href={waLink} target="_blank" rel="noopener noreferrer" className="block mt-3">
                  <Button className="w-full gap-2 bg-green-600 hover:bg-green-700">
                    <MessageCircle className="h-4 w-4" />
                    Hubungi via WhatsApp
                  </Button>
                </a>
              )}
              {!isOwner && listing.status === "ACTIVE" && listing.price > 0 && (
                <PriceOfferButton
                  listingId={listing.id}
                  listingTitle={listing.title}
                  currentPrice={listing.price}
                />
              )}
            </CardContent>
          </Card>

          <Separator />

          <div>
            <h2 className="font-semibold mb-2">Deskripsi</h2>
            {listing.description.startsWith("<") ? (
              <div
                className="prose prose-sm max-w-none text-muted-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_strong]:text-foreground"
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: listing.description }}
              />
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{listing.description}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
