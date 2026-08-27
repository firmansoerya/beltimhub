import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { DashboardNav } from "../DashboardNav";
import { DashboardSignOut } from "../SignOutButton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const dbUser = await getOrCreateUser(userId);
  if (!dbUser) redirect("/sign-in");

  if (dbUser?.role === "ADMIN" || dbUser?.role === "MODERATOR") {
    redirect("/admin");
  }

  const isOrganizer = dbUser?.role === "ORGANIZER";

  // Cek konten yang sudah dibuat user (untuk tampilkan menu secara kondisional)
  const [hasIklan, hasUmkm, hasLoker, hasToko] = dbUser?.id
    ? await Promise.all([
        prisma.listing.findFirst({ where: { sellerId: dbUser.id }, select: { id: true } }).then(Boolean),
        prisma.umkm.findFirst({ where: { ownerId: dbUser.id }, select: { id: true } }).then(Boolean),
        prisma.jobListing.findFirst({ where: { posterId: dbUser.id }, select: { id: true } }).then(Boolean),
        prisma.umkm.findFirst({ where: { ownerId: dbUser.id, marketplaceStatus: "APPROVED" }, select: { id: true } }).then(Boolean),
      ])
    : [false, false, false, false];

  // Hitung notifikasi: pesan belum dibaca, pesanan butuh aksi, ulasan pending
  const [
    unreadBuyerChat, unreadSellerChat,
    buyerActiveOrders, sellerPendingOrders,
    buyerPendingReviews, sellerUnrepliedReviews,
  ] = dbUser?.id
    ? await Promise.all([
        // Chat belum dibaca (buyer)
        prisma.message.count({
          where: { conversation: { buyerId: dbUser.id }, senderId: { not: dbUser.id }, isRead: false },
        }),
        // Chat belum dibaca (seller)
        prisma.message.count({
          where: { conversation: { sellerId: dbUser.id }, senderId: { not: dbUser.id }, isRead: false },
        }),
        // Pesanan aktif buyer (butuh perhatian: SHIPPED = perlu konfirmasi)
        prisma.marketplaceOrder.count({
          where: { buyerId: dbUser.id, orderStatus: { in: ["SHIPPED"] } },
        }),
        // Pesanan masuk seller (butuh diproses: PAID)
        prisma.marketplaceOrder.count({
          where: { sellerId: dbUser.id, orderStatus: { in: ["PAID"] } },
        }),
        // Ulasan pending buyer (pesanan selesai tapi belum diulas)
        prisma.marketplaceOrder.count({
          where: {
            buyerId: dbUser.id, orderStatus: "COMPLETED",
            items: { some: { product: { umkm: { reviews: { none: { reviewerId: dbUser.id } } } } } },
          },
        }),
        // Ulasan belum dibalas seller
        prisma.umkmReview.count({
          where: { umkm: { ownerId: dbUser.id }, ownerReply: null },
        }),
      ])
    : [0, 0, 0, 0, 0, 0];

  const badgeBuyer = unreadBuyerChat + buyerActiveOrders + buyerPendingReviews;
  const badgeSeller = unreadSellerChat + sellerPendingOrders + sellerUnrepliedReviews;

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-primary hidden md:flex flex-col h-full">
        <div className="h-14 flex items-center px-4 shrink-0">
          <Link href="/" className="font-bold text-lg text-white">
            BeltimHub
          </Link>
        </div>

        <DashboardNav isOrganizer={isOrganizer} hasIklan={hasIklan} hasUmkm={hasUmkm} hasLoker={hasLoker} hasToko={hasToko} badgeBuyer={badgeBuyer} badgeSeller={badgeSeller} />

        <div className="px-3 pb-3 shrink-0">
          <DashboardSignOut />
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header className="md:hidden h-14 flex items-center px-4 border-b bg-background gap-3 shrink-0">
          <Link href="/" className="font-bold text-lg">
            Beltim<span className="text-primary">Hub</span>
          </Link>
          <span className="text-muted-foreground text-sm">/ Dashboard</span>
        </header>
        <main className="flex-1 overflow-y-auto px-6 md:px-8 pb-6 md:pb-8">{children}</main>
      </div>
    </div>
  );
}
