export const revalidate = 60;

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import { MapPin, Clock, User, Star, MessageCircle, TrendingUp, ChevronRight } from "lucide-react";
import { ShareButton } from "@/components/ShareButton";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { ImageGallery } from "./ImageGallery";
import { FjbOwnerActions } from "./FjbOwnerActions";
import { PriceOfferButton } from "./PriceOfferModal";

const miniCardSelect = {
  id: true,
  title: true,
  price: true,
  images: true,
} as const;

type MiniListing = { id: string; title: string; price: number; images: string[] };

function MiniListingCard({ item }: { item: MiniListing }) {
  return (
    <Link href={`/fjb/${item.id}`} className="shrink-0 w-32 group">
      <div className="aspect-square rounded-lg overflow-hidden bg-muted relative">
        {item.images?.[0] ? (
          <Image
            src={item.images[0]}
            alt={item.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="128px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-2xl">📦</span>
          </div>
        )}
      </div>
      <p className="text-xs font-medium mt-1.5 line-clamp-2 group-hover:text-primary transition-colors">{item.title}</p>
      <p className="text-xs font-bold text-primary">{formatPrice(item.price)}</p>
    </Link>
  );
}

function formatPrice(price: number) {
  if (price === 0) return "Gratis";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const listing = await prisma.listing.findUnique({
    where: { id },
    select: { title: true, description: true, price: true, images: true },
  });

  if (!listing) {
    return { title: "Iklan Tidak Ditemukan | BeltimHub" };
  }

  const formattedPrice = listing.price === 0
    ? "Gratis"
    : new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
      }).format(listing.price);
  const description = `${listing.title} - ${formattedPrice}`;

  return {
    title: `${listing.title} | FJB BeltimHub`,
    description,
    openGraph: {
      title: `${listing.title} | FJB BeltimHub`,
      description,
      images: listing.images?.[0] ? [listing.images[0]] : [],
    },
  };
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

  const [sellerListings, similarListings] = await Promise.all([
    prisma.listing.findMany({
      where: { sellerId: listing.sellerId, status: "ACTIVE", id: { not: listing.id } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: miniCardSelect,
    }),
    prisma.listing.findMany({
      where: { category: listing.category, status: "ACTIVE", id: { not: listing.id }, sellerId: { not: listing.sellerId } },
      orderBy: [{ isPremium: "desc" }, { viewCount: "desc" }],
      take: 12,
      select: miniCardSelect,
    }),
  ]);

  const isOwner = !!currentUser && currentUser.id === listing.sellerId;

  const waLink = listing.seller.phoneNumber
    ? `https://wa.me/62${listing.seller.phoneNumber.replace(/^0/, "")}?text=Halo, saya tertarik dengan iklan "${listing.title}" di BeltimHub (beltim.id)`
    : null;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-end mb-6">
        <ShareButton title={listing.title} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Images + Seller's other listings */}
        <div className="space-y-5">
          <ImageGallery images={listing.images ?? []} title={listing.title} />

          {sellerListings.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">Iklan lain dari {listing.seller.nickname ?? listing.seller.fullName}</h3>
                {sellerListings.length > 4 && (
                  <Link href={`/fjb?q=&seller=${listing.sellerId}`} className="flex items-center gap-0.5 text-xs text-teal-600 hover:text-teal-700 font-medium">
                    Lihat semua <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                {sellerListings.slice(0, 6).map((item) => (
                  <MiniListingCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}
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

          <div className="space-y-1 text-sm text-muted-foreground">
            {listing.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {listing.location}
              </span>
            )}
            <div className="flex items-center gap-1 flex-wrap">
              <Clock className="h-4 w-4 shrink-0" />
              <span>
                diposting {formatDistanceToNow(new Date(listing.createdAt), { addSuffix: true, locale: id })}
                {new Date(listing.updatedAt).getTime() - new Date(listing.createdAt).getTime() > 60000 && (
                  <>, diperbarui {formatDistanceToNow(new Date(listing.updatedAt), { addSuffix: true, locale: id })}</>
                )}
              </span>
            </div>
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

      {/* Similar listings */}
      {similarListings.length > 0 && (
        <div className="mt-10">
          <Separator className="mb-6" />
          <h2 className="text-lg font-bold mb-3">Iklan lain yang mungkin kamu suka</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {similarListings.map((item) => (
              <MiniListingCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
