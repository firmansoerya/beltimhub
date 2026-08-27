import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EditListingForm } from "@/app/(main)/fjb/[id]/edit/EditListingForm";
import { PriceOfferList } from "./PriceOfferList";
import { FjbOwnerActions } from "@/app/(main)/fjb/[id]/FjbOwnerActions";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

export default async function DashboardDetailIklanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;

  const [listing, currentUser] = await Promise.all([
    prisma.listing.findUnique({
      where: { id },
      include: {
        priceOffers: {
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } }),
  ]);

  if (!listing || listing.status === "DELETED") notFound();
  if (!currentUser || listing.sellerId !== currentUser.id) redirect("/dashboard/iklan");

  return (
    <div className="pb-8">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-background -mx-6 md:-mx-8 px-6 md:px-8 py-4 border-b mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-tight truncate">Detail Iklan</h1>
              <p className="text-sm text-muted-foreground truncate">{listing.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-4">
            <FjbOwnerActions id={id} status={listing.status} hideEdit />
            <Link
              href={`/fjb/${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Lihat Iklan
            </Link>
          </div>
        </div>
      </div>

      {/* Layout: form kiri (fixed width) + penawaran kanan (flex) */}
      <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start" }}>
        {/* Form Edit — lebar tetap */}
        <div style={{ width: "26rem", flexShrink: 0 }}>
          <EditListingForm
            id={id}
            formId="edit-iklan-form"
            backHref="/dashboard/iklan"
            defaultValues={{
              title: listing.title,
              description: listing.description,
              price: listing.price,
              category: listing.category,
              location: listing.location ?? "",
            }}
            defaultImages={listing.images ?? []}
          />
        </div>

        {/* Daftar Penawaran — ambil sisa ruang, scroll internal */}
        <div style={{ flex: 1, minWidth: 0, position: "sticky", top: "5.5rem", maxHeight: "calc(100vh - 7rem)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div className="border rounded-xl p-4 bg-card h-full flex flex-col overflow-hidden">
            <PriceOfferList
              listingId={id}
              initialOffers={listing.priceOffers.map(o => ({
                ...o,
                createdAt: o.createdAt.toISOString(),
                status: o.status as "PENDING" | "CONTACTED" | "REJECTED",
              }))}
              currentPrice={listing.price}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
