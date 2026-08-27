import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  Users, BadgeCheck, Clock, ShieldCheck,
  Store, Wallet, TrendingUp,
  Calendar, Briefcase, ChevronRight, ArrowUpRight,
  ArrowDownRight, Package, UserPlus,
} from "lucide-react";

export default async function AdminOverviewPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!dbUser || (dbUser.role !== "ADMIN" && dbUser.role !== "MODERATOR")) {
    redirect("/dashboard");
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const [
    totalUsers, verifiedUsers, pendingVerifications, totalAdmins,
    totalUmkm, approvedUmkm, pendingMarketplace,
    totalOrders, completedOrders, pendingWithdrawals,
    totalEvents, totalJobs, totalProducts,
    // Growth: this month
    newUsersThisMonth, newOrdersThisMonth, revenueThisMonth,
    // Growth: last month
    newUsersLastMonth, newOrdersLastMonth, revenueLastMonth,
    // This week
    newUsersThisWeek, newOrdersThisWeek,
    // Recent data
    recentUsers, recentOrders, recentWithdrawals,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isVerified: true } }),
    prisma.verificationRequest.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { role: { in: ["ADMIN", "MODERATOR"] } } }),
    prisma.umkm.count(),
    prisma.umkm.count({ where: { marketplaceStatus: "APPROVED" } }),
    prisma.umkm.count({ where: { marketplaceStatus: "PENDING_REVIEW" } }),
    prisma.marketplaceOrder.count(),
    prisma.marketplaceOrder.count({ where: { orderStatus: "COMPLETED" } }),
    prisma.sellerWithdrawal.count({ where: { status: "PENDING" } }),
    prisma.event.count({ where: { status: "PUBLISHED" } }),
    prisma.jobListing.count({ where: { isActive: true } }),
    prisma.product.count({ where: { status: "ACTIVE" } }),
    // Growth: this month
    prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.marketplaceOrder.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.marketplaceOrder.aggregate({
      where: { orderStatus: "COMPLETED", createdAt: { gte: startOfMonth } },
      _sum: { platformFee: true },
    }),
    // Growth: last month
    prisma.user.count({ where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth } } }),
    prisma.marketplaceOrder.count({ where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth } } }),
    prisma.marketplaceOrder.aggregate({
      where: { orderStatus: "COMPLETED", createdAt: { gte: startOfLastMonth, lt: startOfMonth } },
      _sum: { platformFee: true },
    }),
    // This week
    prisma.user.count({ where: { createdAt: { gte: startOfWeek } } }),
    prisma.marketplaceOrder.count({ where: { createdAt: { gte: startOfWeek } } }),
    // Recent users
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, fullName: true, email: true, createdAt: true, isVerified: true },
    }),
    // Recent paid orders (uang masuk)
    prisma.marketplaceOrder.findMany({
      where: { paidAt: { not: null } },
      orderBy: { paidAt: "desc" },
      take: 8,
      select: {
        id: true, invoiceNumber: true, totalAmount: true, platformFee: true,
        paidAt: true,
        buyer: { select: { fullName: true } },
        items: { select: { product: { select: { umkm: { select: { name: true } } } } }, take: 1 },
      },
    }),
    // Recent completed withdrawals (uang keluar)
    prisma.sellerWithdrawal.findMany({
      where: { status: { in: ["COMPLETED", "PROCESSING"] } },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true, amount: true, netAmount: true, status: true,
        completedAt: true, createdAt: true,
        seller: { select: { fullName: true } },
        umkm: { select: { name: true } },
      },
    }),
  ]);

  // Build mutation log (uang masuk + keluar, sorted by date)
  type Mutation = {
    id: string; type: "in" | "out";
    title: string; detail: string; badge?: string;
    amount: number; date: Date;
  };
  const mutations: Mutation[] = [
    ...recentOrders.map((o) => {
      const storeName = o.items?.[0]?.product?.umkm?.name;
      const invoice = (o.invoiceNumber ?? o.id.slice(-8)).toUpperCase();
      return {
        id: o.id,
        type: "in" as const,
        title: "Pembayaran diterima",
        detail: `#${invoice} · ${storeName ?? o.buyer?.fullName ?? "—"}`,
        amount: o.totalAmount,
        date: o.paidAt!,
      };
    }),
    ...recentWithdrawals.map((w) => ({
      id: w.id,
      type: "out" as const,
      title: "Pencairan dana ke penjual",
      detail: `${w.umkm?.name ?? "—"} · ${w.seller?.fullName ?? "—"}`,
      badge: w.status === "COMPLETED" ? "Selesai" : "Diproses",
      amount: w.netAmount || w.amount,
      date: w.completedAt ?? w.createdAt,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);

  // Revenue totals
  const totalRevenueResult = await prisma.marketplaceOrder.aggregate({
    where: { orderStatus: "COMPLETED" },
    _sum: { platformFee: true, totalAmount: true },
  });
  const totalRevenue = totalRevenueResult._sum.platformFee ?? 0;
  const totalGMV = totalRevenueResult._sum.totalAmount ?? 0;
  const revenueThisMonthVal = revenueThisMonth._sum.platformFee ?? 0;
  const revenueLastMonthVal = revenueLastMonth._sum.platformFee ?? 0;

  // Growth calculations
  function calcGrowth(current: number, previous: number): number | null {
    if (previous === 0) return current > 0 ? 100 : null;
    return Math.round(((current - previous) / previous) * 100);
  }

  const userGrowth = calcGrowth(newUsersThisMonth, newUsersLastMonth);
  const orderGrowth = calcGrowth(newOrdersThisMonth, newOrdersLastMonth);
  const revenueGrowth = calcGrowth(revenueThisMonthVal, revenueLastMonthVal);

  const actionItems = [
    { label: "Verifikasi User", count: pendingVerifications, href: "/admin/verifikasi", icon: BadgeCheck, color: "text-yellow-600", bg: "bg-yellow-50" },
    { label: "Review Toko Baru", count: pendingMarketplace, href: "/admin/marketplace", icon: Store, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Pencairan Dana", count: pendingWithdrawals, href: "/admin/withdrawals", icon: Wallet, color: "text-green-600", bg: "bg-green-50" },
  ].filter(a => a.count > 0);

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-20 bg-muted/30 backdrop-blur-sm -mx-4 md:-mx-8 px-4 md:px-8 py-5 border-b mb-6">
        <div className="flex items-center justify-between max-w-6xl">
          <div>
            <h1 className="text-2xl font-bold">Dashboard Admin</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Selamat datang, {dbUser.fullName}
            </p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-xs text-muted-foreground">
              {now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Action Items */}
        {actionItems.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Perlu Perhatian</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {actionItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between p-4 bg-background border rounded-xl hover:shadow-md transition-all group border-l-4 border-l-amber-400"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${item.bg}`}>
                      <item.icon className={`h-4 w-4 ${item.color}`} />
                    </div>
                    <div>
                      <span className="text-sm font-medium">{item.label}</span>
                      <p className="text-xs text-muted-foreground">menunggu tindakan</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-amber-600">{item.count}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Hero Stats — 4 big cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <HeroStat
            label="Total Pengguna"
            value={totalUsers}
            sub={`+${newUsersThisWeek} minggu ini`}
            icon={Users}
            color="text-blue-600"
            bg="bg-blue-50"
            growth={userGrowth}
          />
          <HeroStat
            label="Total Pesanan"
            value={totalOrders}
            sub={`${completedOrders} selesai`}
            icon={Package}
            color="text-purple-600"
            bg="bg-purple-50"
            growth={orderGrowth}
          />
          <HeroStat
            label="Pendapatan Platform"
            value={formatRupiah(totalRevenue)}
            sub={`GMV: ${formatRupiah(totalGMV)}`}
            icon={TrendingUp}
            color="text-green-600"
            bg="bg-green-50"
            growth={revenueGrowth}
            isText
          />
          <HeroStat
            label="Toko Aktif"
            value={approvedUmkm}
            sub={`${totalProducts} produk aktif`}
            icon={Store}
            color="text-teal-600"
            bg="bg-teal-50"
          />
        </div>

        {/* Secondary Stats — 2-row grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MiniStat label="Terverifikasi" value={verifiedUsers} total={totalUsers} icon={BadgeCheck} color="text-green-600" />
          <MiniStat label="Admin/Mod" value={totalAdmins} icon={ShieldCheck} color="text-purple-600" />
          <MiniStat label="Total UMKM" value={totalUmkm} icon={Store} color="text-teal-600" />
          <MiniStat label="Event Aktif" value={totalEvents} icon={Calendar} color="text-indigo-600" />
          <MiniStat label="Loker Aktif" value={totalJobs} icon={Briefcase} color="text-red-600" />
          <MiniStat label="Menunggu Review" value={pendingMarketplace} icon={Clock} color="text-yellow-600" href="/admin/marketplace" />
        </div>

        {/* Monthly Summary */}
        <div className="bg-background border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Ringkasan Bulan Ini</h2>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-2xl font-bold">{newUsersThisMonth}</p>
              <p className="text-xs text-muted-foreground mt-0.5">User Baru</p>
              <GrowthBadge growth={userGrowth} />
            </div>
            <div>
              <p className="text-2xl font-bold">{newOrdersThisMonth}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Pesanan Baru</p>
              <GrowthBadge growth={orderGrowth} />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatRupiah(revenueThisMonthVal)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Revenue</p>
              <GrowthBadge growth={revenueGrowth} />
            </div>
          </div>
        </div>

        {/* Recent Activity — Two columns */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Users */}
          <div className="bg-background border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-blue-600" />
                Pendaftar Terbaru
              </h3>
              <Link href="/admin/users" className="text-xs text-primary hover:underline">Lihat Semua</Link>
            </div>
            <div className="divide-y">
              {recentUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {u.fullName}
                      {u.isVerified && <BadgeCheck className="inline h-3.5 w-3.5 text-blue-500 ml-1" />}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{u.email ?? "—"}</p>
                  </div>
                  <p className="text-xs text-muted-foreground shrink-0">
                    {timeAgo(u.createdAt)}
                  </p>
                </div>
              ))}
              {recentUsers.length === 0 && (
                <p className="px-5 py-6 text-sm text-muted-foreground text-center">Belum ada pendaftar</p>
              )}
            </div>
          </div>

          {/* Mutasi Rekening */}
          <div className="bg-background border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Wallet className="h-4 w-4 text-teal-600" />
                Mutasi Rekening
              </h3>
              <Link href="/admin/withdrawals" className="text-xs text-primary hover:underline">Lihat Keuangan</Link>
            </div>
            <div className="divide-y">
              {mutations.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                    m.type === "in" ? "bg-green-100" : "bg-red-100"
                  }`}>
                    {m.type === "in"
                      ? <ArrowDownRight className="h-4 w-4 text-green-600" />
                      : <ArrowUpRight className="h-4 w-4 text-red-500" />
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{m.title}</p>
                      {m.badge && (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          m.badge === "Selesai" ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600"
                        }`}>{m.badge}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{m.detail}</p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className={`text-sm font-bold tabular-nums ${m.type === "in" ? "text-green-600" : "text-red-500"}`}>
                      {m.type === "in" ? "+" : "−"} {formatRupiah(m.amount)}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{timeAgo(m.date)}</p>
                  </div>
                </div>
              ))}
              {mutations.length === 0 && (
                <p className="px-5 py-8 text-sm text-muted-foreground text-center">Belum ada mutasi</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Components ---

function HeroStat({ label, value, sub, icon: Icon, color, bg, growth, isText }: {
  label: string; value: number | string; sub: string;
  icon: React.ElementType; color: string; bg: string;
  growth?: number | null; isText?: boolean;
}) {
  return (
    <div className="bg-background border rounded-xl p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className={`inline-flex p-2.5 rounded-lg ${bg}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        {growth != null && <GrowthBadge growth={growth} />}
      </div>
      <p className={`font-bold ${isText ? "text-xl" : "text-3xl"} tracking-tight`}>
        {typeof value === "number" ? value.toLocaleString("id-ID") : value}
      </p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
      <p className="text-[11px] text-muted-foreground/70 mt-0.5">{sub}</p>
    </div>
  );
}

function MiniStat({ label, value, total, icon: Icon, color, href }: {
  label: string; value: number; total?: number;
  icon: React.ElementType; color: string; href?: string;
}) {
  const content = (
    <div className="bg-background border rounded-xl p-3.5 hover:shadow-sm transition-shadow">
      <Icon className={`h-4 w-4 ${color} mb-2`} />
      <p className="text-xl font-bold">{value.toLocaleString("id-ID")}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">
        {label}
        {total != null && <span className="text-muted-foreground/50"> / {total}</span>}
      </p>
    </div>
  );
  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

function GrowthBadge({ growth }: { growth: number | null }) {
  if (growth == null) return null;
  const isPositive = growth >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium mt-1 ${
      isPositive ? "text-green-600" : "text-red-500"
    }`}>
      {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(growth)}% vs bulan lalu
    </span>
  );
}

function timeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins}m lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}j lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}h lalu`;
  return new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function formatRupiah(n: number) {
  if (n === 0) return "Rp 0";
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}rb`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}
