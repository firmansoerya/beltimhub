import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MarketplaceReviewButtons } from "./MarketplaceReviewButtons";
import { MarketplaceFeeConfig } from "./MarketplaceFeeConfig";
import { ImageViewer } from "./ImageViewer";
import { Clock, CheckCircle2, XCircle, Settings2 } from "lucide-react";

const REVIEW_TABS = ["PENDING_REVIEW", "APPROVED", "REJECTED"] as const;
type ReviewTab = (typeof REVIEW_TABS)[number];
const ALL_TABS = [...REVIEW_TABS, "fees"] as const;
type Tab = (typeof ALL_TABS)[number];

export default async function AdminMarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!dbUser || (dbUser.role !== "ADMIN" && dbUser.role !== "MODERATOR")) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const tab: Tab = ALL_TABS.includes(params.tab as Tab) ? (params.tab as Tab) : "PENDING_REVIEW";
  const isFeeTab = tab === "fees";

  // Only fetch UMKM list when on review tabs
  const umkmList = isFeeTab
    ? []
    : await prisma.umkm.findMany({
        where: { marketplaceStatus: tab as ReviewTab },
        orderBy: tab === "PENDING_REVIEW"
          ? { marketplaceAppliedAt: "asc" }
          : { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          category: true,
          imageUrl: true,
          bankName: true,
          bankAccountNumber: true,
          bankAccountName: true,
          shippingMethods: true,
          marketplaceAppliedAt: true,
          marketplaceRejectedReason: true,
          verificationKtpName: true,
          verificationKtpNumber: true,
          verificationKtpImageUrl: true,
          verificationNibNumber: true,
          verificationStorePhotos: true,
          phone: true,
          owner: { select: { fullName: true, email: true, phoneNumber: true } },
        },
      });

  const [pendingCount, approvedCount, rejectedCount] = isFeeTab
    ? [0, 0, 0]
    : await Promise.all([
        prisma.umkm.count({ where: { marketplaceStatus: "PENDING_REVIEW" } }),
        prisma.umkm.count({ where: { marketplaceStatus: "APPROVED" } }),
        prisma.umkm.count({ where: { marketplaceStatus: "REJECTED" } }),
      ]);

  const tabConfig = {
    PENDING_REVIEW: { label: "Menunggu", icon: Clock, color: "text-yellow-600", count: pendingCount },
    APPROVED: { label: "Disetujui", icon: CheckCircle2, color: "text-green-600", count: approvedCount },
    REJECTED: { label: "Ditolak", icon: XCircle, color: "text-red-500", count: rejectedCount },
    fees: { label: "Pengaturan Fee", icon: Settings2, color: "text-gray-600", count: 0 },
  };

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 pb-20">
      {/* Header */}
      <div className="mb-6 pb-4 border-b">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mb-1.5">
          <span>Pasar Lokal</span>
          <span>/</span>
          <span className="text-primary font-semibold">
            {isFeeTab ? "Biaya & Komisi" : "Verifikasi Toko"}
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {isFeeTab ? "Pengaturan Biaya & Komisi Marketplace" : "Verifikasi Toko UMKM"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isFeeTab
            ? "Kelola persentase komisi platform & biaya transaksi Pasar Lokal"
            : "Review pengajuan pendaftaran toko & verifikasi identitas merchant"}
        </p>

        {/* Status tabs specifically for Verifikasi Toko (Menunggu, Disetujui, Ditolak) */}
        {!isFeeTab && (
          <div className="flex flex-wrap gap-2 mt-5">
            {REVIEW_TABS.map((t) => {
              const { label, icon: Icon, color, count } = tabConfig[t];
              const isActive = tab === t;
              return (
                <a
                  key={t}
                  href={`/admin/marketplace?tab=${t}`}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-background border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-accent"
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary-foreground" : color}`} />
                  {label}
                  {count > 0 && (
                    <span
                      className={`text-[11px] min-w-[20px] h-5 px-1.5 rounded-full font-bold flex items-center justify-center ${
                        isActive
                          ? "bg-white/25 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* Fee Config Tab */}
      {isFeeTab ? (
        <MarketplaceFeeConfig />
      ) : (
        /* Review Tab */
        <div>
          {umkmList.length === 0 ? (
            <p className="text-center py-16 text-muted-foreground text-sm">
              Tidak ada pengajuan dengan status ini.
            </p>
          ) : (
            <div className="space-y-3">
              {umkmList.map((umkm) => (
                <div key={umkm.id} className="bg-background border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    {/* Info UMKM */}
                    <div className="flex items-start gap-3">
                      {umkm.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={umkm.imageUrl}
                          alt={umkm.name}
                          className="w-14 h-14 rounded-lg object-cover border shrink-0"
                        />
                      )}
                      <div className="space-y-0.5">
                        <p className="font-medium">{umkm.name}</p>
                        <p className="text-xs text-muted-foreground">{umkm.category}</p>
                        <p className="text-xs text-muted-foreground">
                          Pemilik: {umkm.owner.fullName} · {umkm.owner.email ?? "—"}
                        </p>
                        {(umkm.phone || umkm.owner.phoneNumber) && (
                          <p className="text-xs text-muted-foreground">
                            Telp:{" "}
                            <a
                              href={`tel:${umkm.phone || umkm.owner.phoneNumber}`}
                              className="text-primary hover:underline"
                            >
                              {umkm.phone || umkm.owner.phoneNumber}
                            </a>
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Diajukan:{" "}
                          {umkm.marketplaceAppliedAt
                            ? new Date(umkm.marketplaceAppliedAt).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })
                            : "—"}
                        </p>
                      </div>
                    </div>

                    {/* Info verifikasi */}
                    <div className="text-right space-y-1">
                      <p className="text-xs text-muted-foreground">
                        KTP:{" "}
                        <span className="text-foreground font-medium">
                          {umkm.verificationKtpName ?? "—"}
                        </span>{" "}
                        ({umkm.verificationKtpNumber ?? "—"})
                      </p>
                      {umkm.verificationNibNumber && (
                        <p className="text-xs text-muted-foreground">
                          NIB: <span className="text-foreground">{umkm.verificationNibNumber}</span>
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Bank:{" "}
                        <span className="text-foreground">
                          {umkm.bankName ?? "—"} — {umkm.bankAccountNumber ?? "—"} a/n{" "}
                          {umkm.bankAccountName ?? "—"}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Alasan ditolak */}
                  {tab === "REJECTED" && umkm.marketplaceRejectedReason && (
                    <p className="text-xs text-red-500 mt-2">
                      Alasan: {umkm.marketplaceRejectedReason}
                    </p>
                  )}

                  {/* Foto KTP & Toko */}
                  {tab === "PENDING_REVIEW" && (
                    <>
                      <div className="mt-3">
                        <ImageViewer
                          images={[
                            ...(umkm.verificationKtpImageUrl
                              ? [{ src: umkm.verificationKtpImageUrl, label: "KTP" }]
                              : []),
                            ...umkm.verificationStorePhotos.map((photo, i) => ({
                              src: photo,
                              label: `Toko ${i + 1}`,
                            })),
                          ]}
                        />
                      </div>

                      <div className="mt-3 flex justify-end">
                        <MarketplaceReviewButtons umkmId={umkm.id} />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
