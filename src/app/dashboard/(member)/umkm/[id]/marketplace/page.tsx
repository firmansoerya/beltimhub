import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MarketplaceApplyClient } from "./MarketplaceApplyClient";

export default async function MarketplaceApplyPage({
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
      select: {
        id: true,
        name: true,
        ownerId: true,
        marketplaceStatus: true,
        // Pre-fill data jika re-apply
        verificationKtpName: true,
        verificationKtpNumber: true,
        verificationKtpImageUrl: true,
        verificationNibNumber: true,
        verificationNibImageUrl: true,
        verificationStorePhotos: true,
        bankName: true,
        bankAccountNumber: true,
        bankAccountName: true,
      },
    }),
    prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } }),
  ]);

  if (!umkm) notFound();
  if (!currentUser || umkm.ownerId !== currentUser.id) redirect("/dashboard/umkm");

  // Sudah approved → redirect ke edit
  if (umkm.marketplaceStatus === "APPROVED") redirect(`/dashboard/umkm/${id}/edit`);
  // Sedang review → redirect ke edit (akan melihat status badge)
  if (umkm.marketplaceStatus === "PENDING_REVIEW") redirect(`/dashboard/umkm/${id}/edit`);

  return (
    <div className="pb-8">
      <MarketplaceApplyClient
        umkmId={umkm.id}
        umkmName={umkm.name}
        defaultData={{
          ktpName: umkm.verificationKtpName ?? "",
          ktpNumber: umkm.verificationKtpNumber ?? "",
          ktpImageUrl: umkm.verificationKtpImageUrl ?? "",
          nibNumber: umkm.verificationNibNumber ?? "",
          nibImageUrl: umkm.verificationNibImageUrl ?? "",
          bankName: umkm.bankName ?? "",
          bankAccountNumber: umkm.bankAccountNumber ?? "",
          bankAccountName: umkm.bankAccountName ?? "",
          storePhotos: umkm.verificationStorePhotos ?? [],
        }}
      />
    </div>
  );
}
