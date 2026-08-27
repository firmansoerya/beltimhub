import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EditUmkmForm } from "@/app/(main)/umkm/[id]/edit/EditUmkmForm";
import { UmkmReviewDashboard } from "./UmkmReviewDashboard";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

export default async function DashboardDetailUmkmPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;

  const [umkm, currentUser] = await Promise.all([
    prisma.umkm.findUnique({
      where: { id },
      include: {
        reviews: {
          include: { reviewer: { select: { fullName: true, avatarUrl: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } }),
  ]);

  if (!umkm) notFound();
  if (!currentUser || umkm.ownerId !== currentUser.id) redirect("/dashboard/umkm");

  return (
    <div className="pb-8">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-background -mx-6 md:-mx-8 px-6 md:px-8 py-4 border-b mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-tight truncate">Detail UMKM</h1>
              <p className="text-sm text-muted-foreground truncate">{umkm.name}</p>
            </div>
          </div>
          <Link
            href={`/umkm/${id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-4"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Lihat UMKM
          </Link>
        </div>
      </div>

      {/* Layout: form edit (lebih lebar) + list review (lebih kecil) */}
      <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start" }}>
        {/* Form Edit — ambil sisa ruang */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <EditUmkmForm
            id={id}
            formId="edit-umkm-form"
            backHref="/dashboard/umkm"
            defaultValues={{
              name: umkm.name,
              category: umkm.category,
              description: umkm.description,
              address: umkm.address ?? "",
              latitude: umkm.latitude ?? undefined,
              longitude: umkm.longitude ?? undefined,
              mapsUrl: umkm.mapsUrl ?? "",
              phone: umkm.phone ?? "",
              instagram: umkm.instagram ?? "",
              website: umkm.website ?? "",
            }}
            defaultImageUrl={umkm.imageUrl ?? ""}
            defaultGallery={umkm.gallery ?? []}
            defaultIsMarketplace={umkm.isMarketplace}
            defaultShippingMethods={umkm.shippingMethods ?? []}
            defaultOperatingHours={umkm.operatingHours ?? ""}
            defaultReplyTime={umkm.replyTime ?? ""}
            marketplaceStatus={umkm.marketplaceStatus}
            marketplaceRejectedReason={umkm.marketplaceRejectedReason}
          />
        </div>

        {/* Daftar Ulasan — 50% lebar, scroll internal */}
        <div style={{ flex: 1, minWidth: 0, position: "sticky", top: "5.5rem", maxHeight: "calc(100vh - 7rem)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div className="border rounded-xl p-4 bg-card h-full flex flex-col overflow-hidden">
            <UmkmReviewDashboard
              umkmId={id}
              initialReviews={umkm.reviews.map(r => ({
                id: r.id,
                rating: r.rating,
                comment: r.comment,
                ownerReply: r.ownerReply,
                ownerRepliedAt: r.ownerRepliedAt ? r.ownerRepliedAt.toISOString() : null,
                createdAt: r.createdAt.toISOString(),
                reviewer: r.reviewer,
              }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
