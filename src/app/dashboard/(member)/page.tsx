import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import Link from "next/link";
import {
  Ticket, ShoppingBag, Store, Briefcase,
  ChevronRight, Package, Clock, Star,
  MessageSquare, MapPin, Plus,
} from "lucide-react";

export default async function DashboardHomePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const dbUser = await getOrCreateUser(userId);
  if (!dbUser) redirect("/sign-in");

  // Fetch dashboard data
  const [
    upcomingTickets, activeOrders, unreadMessages,
    myListings, myUmkm, myJobs, savedAddresses,
    sellerOrders, pendingReviews,
  ] = await Promise.all([
    // Tiket upcoming
    prisma.ticket.count({
      where: {
        userId: dbUser.id,
        paymentStatus: "PAID",
        event: { eventDate: { gte: new Date() } },
      },
    }),
    // Pesanan aktif (buyer)
    prisma.marketplaceOrder.count({
      where: {
        buyerId: dbUser.id,
        orderStatus: { in: ["PAID", "PROCESSING", "SHIPPED"] },
      },
    }),
    // Pesan belum dibaca
    prisma.message.count({
      where: {
        conversation: { buyerId: dbUser.id },
        senderId: { not: dbUser.id },
        isRead: false,
      },
    }),
    // Iklan saya
    prisma.listing.count({ where: { sellerId: dbUser.id } }),
    // UMKM saya
    prisma.umkm.findFirst({
      where: { ownerId: dbUser.id },
      select: { id: true, name: true, marketplaceStatus: true },
    }),
    // Loker saya
    prisma.jobListing.count({ where: { posterId: dbUser.id } }),
    // Alamat tersimpan
    prisma.shippingAddress.count({ where: { userId: dbUser.id } }),
    // Pesanan seller (jika punya toko)
    prisma.marketplaceOrder.count({
      where: { sellerId: dbUser.id, orderStatus: { in: ["PAID"] } },
    }),
    // Review belum dibalas
    prisma.umkmReview.count({
      where: { umkm: { ownerId: dbUser.id }, ownerReply: null },
    }),
  ]);

  const hasToko = myUmkm?.marketplaceStatus === "APPROVED";

  const quickActions = [
    upcomingTickets > 0 && { icon: Ticket, label: "Tiket Mendatang", count: upcomingTickets, href: "/dashboard/tiket", color: "text-purple-600 bg-purple-50" },
    activeOrders > 0 && { icon: Package, label: "Pesanan Aktif", count: activeOrders, href: "/dashboard/pesan", color: "text-blue-600 bg-blue-50" },
    unreadMessages > 0 && { icon: MessageSquare, label: "Pesan Belum Dibaca", count: unreadMessages, href: "/dashboard/pesan", color: "text-green-600 bg-green-50" },
    hasToko && sellerOrders > 0 && { icon: ShoppingBag, label: "Pesanan Masuk", count: sellerOrders, href: "/dashboard/toko?tab=pesanan", color: "text-orange-600 bg-orange-50" },
    hasToko && pendingReviews > 0 && { icon: Star, label: "Ulasan Belum Dibalas", count: pendingReviews, href: "/dashboard/toko?tab=ulasan", color: "text-amber-600 bg-amber-50" },
  ].filter(Boolean) as { icon: React.ElementType; label: string; count: number; href: string; color: string }[];

  const shortcuts = [
    { icon: Ticket, label: "Tiket Saya", href: "/dashboard/tiket", desc: "Lihat semua tiket event" },
    { icon: ShoppingBag, label: "Pembelian", href: "/dashboard/pesan", desc: "Pesanan & percakapan" },
    { icon: MapPin, label: "Alamat", href: "/dashboard/alamat", desc: `${savedAddresses} alamat tersimpan` },
    ...(hasToko ? [{ icon: Store, label: "Toko Saya", href: "/dashboard/toko", desc: myUmkm?.name || "Kelola toko" }] : []),
    ...(myListings > 0 ? [{ icon: Briefcase, label: "Iklan Saya", href: "/dashboard/iklan", desc: `${myListings} iklan aktif` }] : []),
    ...(myJobs > 0 ? [{ icon: Briefcase, label: "Lowongan Saya", href: "/dashboard/loker", desc: `${myJobs} lowongan` }] : []),
  ];

  return (
    <div className="py-6 md:py-8 max-w-3xl">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          Halo, {dbUser.nickname || dbUser.fullName?.split(" ")[0]}!
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ini ringkasan aktivitasmu di BeltimHub
        </p>
      </div>

      {/* Action Items */}
      {quickActions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Perlu Perhatian</h2>
          <div className="space-y-2">
            {quickActions.map((action) => (
              <Link
                key={action.href + action.label}
                href={action.href}
                className="flex items-center justify-between p-3.5 bg-background border rounded-xl hover:shadow-sm transition-shadow group"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${action.color}`}>
                    <action.icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium">{action.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-primary">{action.count}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Navigation */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Menu Cepat</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {shortcuts.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="p-4 bg-background border rounded-xl hover:shadow-sm transition-shadow group"
            >
              <item.icon className="w-5 h-5 text-primary mb-2" />
              <p className="text-sm font-medium group-hover:text-primary transition-colors">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Explore CTA */}
      {!myUmkm && (
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl p-6 text-white">
          <h3 className="font-semibold mb-1">Punya usaha di Belitung Timur?</h3>
          <p className="text-teal-100 text-sm mb-4">Daftarkan UMKM-mu dan mulai berjualan di Pasar Lokal</p>
          <Link
            href="/umkm/tambah"
            className="inline-flex items-center gap-2 bg-white text-teal-700 font-medium px-4 py-2 rounded-lg text-sm hover:bg-teal-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Daftarkan UMKM
          </Link>
        </div>
      )}
    </div>
  );
}
