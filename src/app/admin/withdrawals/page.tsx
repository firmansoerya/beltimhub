import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getXenditBalance } from "@/lib/xendit-disbursement";
import { WithdrawalActions } from "./WithdrawalActions";
import Link from "next/link";
import {
  Wallet, TrendingUp, ArrowUpRight, ArrowDownRight,
  Clock, CreditCard, CircleDollarSign, Receipt, Search,
} from "lucide-react";

const ALL_TABS = ["ringkasan", "transaksi", "pencairan"] as const;
type Tab = (typeof ALL_TABS)[number];

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Menunggu",
  PROCESSING: "Diproses",
  COMPLETED: "Selesai",
  FAILED: "Gagal",
  REJECTED: "Ditolak",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-50 text-yellow-700",
  PROCESSING: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-green-50 text-green-700",
  FAILED: "bg-red-50 text-red-700",
  REJECTED: "bg-gray-100 text-gray-600",
};

function formatRupiah(n: number) {
  if (n === 0) return "Rp 0";
  return "Rp " + n.toLocaleString("id-ID");
}

function formatRupiahShort(n: number) {
  if (n === 0) return "Rp 0";
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}rb`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function formatDate(d: Date | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(d: Date | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminKeuanganPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string; q?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const admin = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!admin || admin.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const tab: Tab = ALL_TABS.includes(params.tab as Tab) ? (params.tab as Tab) : "ringkasan";
  const statusFilter = params.status || "ALL";
  const q = params.q;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // --- Shared data ---
  const withdrawalAggregates = await prisma.sellerWithdrawal.groupBy({
    by: ["status"],
    _sum: { netAmount: true, withdrawalFee: true },
    _count: true,
  });

  const totalWithdrawn = withdrawalAggregates.find((a) => a.status === "COMPLETED")?._sum.netAmount ?? 0;
  const totalWithdrawalFees = withdrawalAggregates.reduce((sum, a) => sum + (a.status === "COMPLETED" ? (a._sum.withdrawalFee ?? 0) : 0), 0);
  const totalPendingAmount = (withdrawalAggregates.find((a) => a.status === "PENDING")?._sum.netAmount ?? 0)
    + (withdrawalAggregates.find((a) => a.status === "PROCESSING")?._sum.netAmount ?? 0);
  const pendingCount = (withdrawalAggregates.find((a) => a.status === "PENDING")?._count ?? 0)
    + (withdrawalAggregates.find((a) => a.status === "PROCESSING")?._count ?? 0);

  // Tab-specific data
  let xenditBalance: number | null = null;
  let revenueTotal = 0;
  let gmvTotal = 0;
  let revenueThisMonth = 0;
  let revenueLastMonth = 0;
  let ordersThisMonth = 0;
  let ordersLastMonth = 0;
  let totalCompletedOrders = 0;

  if (tab === "ringkasan") {
    try {
      const bd = await getXenditBalance();
      xenditBalance = bd.balance;
    } catch {
      xenditBalance = null;
    }

    const [revTotal, revThisMonth, revLastMonth, ordThisMonth, ordLastMonth, completedCount] = await Promise.all([
      prisma.marketplaceOrder.aggregate({
        where: { orderStatus: "COMPLETED" },
        _sum: { platformFee: true, totalAmount: true },
      }),
      prisma.marketplaceOrder.aggregate({
        where: { orderStatus: "COMPLETED", completedAt: { gte: startOfMonth } },
        _sum: { platformFee: true },
      }),
      prisma.marketplaceOrder.aggregate({
        where: { orderStatus: "COMPLETED", completedAt: { gte: startOfLastMonth, lt: startOfMonth } },
        _sum: { platformFee: true },
      }),
      prisma.marketplaceOrder.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.marketplaceOrder.count({ where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth } } }),
      prisma.marketplaceOrder.count({ where: { orderStatus: "COMPLETED" } }),
    ]);

    revenueTotal = revTotal._sum.platformFee ?? 0;
    gmvTotal = revTotal._sum.totalAmount ?? 0;
    revenueThisMonth = revThisMonth._sum.platformFee ?? 0;
    revenueLastMonth = revLastMonth._sum.platformFee ?? 0;
    ordersThisMonth = ordThisMonth;
    ordersLastMonth = ordLastMonth;
    totalCompletedOrders = completedCount;
  }

  // Transactions tab
  let recentOrders: Array<{
    id: string; invoiceNumber: string | null; xenditRefId: string | null;
    totalAmount: number; platformFee: number; sellerAmount: number;
    completedAt: Date | null;
    buyer: { fullName: string | null };
    items: Array<{ product: { umkm: { name: string } | null } | null }>;
  }> = [];
  if (tab === "transaksi") {
    const searchWhere = q
      ? {
          orderStatus: "COMPLETED" as const,
          OR: [
            { invoiceNumber: { contains: q, mode: "insensitive" as const } },
            { buyer: { fullName: { contains: q, mode: "insensitive" as const } } },
            { items: { some: { product: { umkm: { name: { contains: q, mode: "insensitive" as const } } } } } },
          ],
        }
      : { orderStatus: "COMPLETED" as const };

    recentOrders = await prisma.marketplaceOrder.findMany({
      where: searchWhere,
      orderBy: { completedAt: "desc" },
      take: 50,
      select: {
        id: true, invoiceNumber: true, xenditRefId: true,
        totalAmount: true, platformFee: true, sellerAmount: true, completedAt: true,
        buyer: { select: { fullName: true } },
        items: { take: 1, select: { product: { select: { umkm: { select: { name: true } } } } } },
      },
    });
  }

  // Withdrawals tab
  let withdrawals: Array<{
    id: string; amount: number; withdrawalFee: number; netAmount: number;
    status: string; bankName: string; bankAccountNumber: string; bankAccountName: string;
    rejectedReason: string | null; adminNote: string | null; createdAt: Date;
    seller: { fullName: string | null; email: string | null };
    umkm: { name: string };
  }> = [];
  if (tab === "pencairan") {
    const withdrawalWhere = statusFilter !== "ALL" ? { status: statusFilter as any } : {};
    withdrawals = await prisma.sellerWithdrawal.findMany({
      where: withdrawalWhere,
      orderBy: { createdAt: "desc" },
      include: {
        seller: { select: { fullName: true, email: true } },
        umkm: { select: { name: true } },
      },
    });
  }

  const revenueGrowth = revenueLastMonth === 0
    ? (revenueThisMonth > 0 ? 100 : null)
    : Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100);

  const orderGrowth = ordersLastMonth === 0
    ? (ordersThisMonth > 0 ? 100 : null)
    : Math.round(((ordersThisMonth - ordersLastMonth) / ordersLastMonth) * 100);

  const tabConfig = {
    ringkasan: { label: "Ringkasan", icon: TrendingUp, color: "text-green-600" },
    transaksi: { label: "Transaksi", icon: Receipt, color: "text-blue-600" },
    pencairan: { label: "Pencairan", icon: Wallet, color: "text-purple-600" },
  };

  const withdrawalStatusTabs = [
    { key: "ALL", label: "Semua" },
    { key: "PENDING", label: "Menunggu" },
    { key: "PROCESSING", label: "Diproses" },
    { key: "COMPLETED", label: "Selesai" },
    { key: "FAILED", label: "Gagal" },
    { key: "REJECTED", label: "Ditolak" },
  ];

  const activeTabTitle = tab === "ringkasan" ? "Ringkasan Keuangan" : tab === "transaksi" ? "Riwayat Transaksi" : "Pencairan Dana Toko";
  const activeTabDesc = tab === "ringkasan"
    ? "Statistik pendapatan, GMV, saldo escrow, dan pertumbuhan platform"
    : tab === "transaksi"
      ? "Daftar seluruh transaksi pembayaran masuk dari pelanggan"
      : "Kelola dan proses pengajuan penarikan saldo dari merchant UMKM";

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 pb-20">
      {/* Header */}
      <div className="mb-6 pb-4 border-b">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mb-1.5">
          <span>Keuangan</span>
          <span>/</span>
          <span className="text-primary font-semibold">
            {tabConfig[tab]?.label ?? "Keuangan"}
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{activeTabTitle}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {activeTabDesc}
        </p>
      </div>

      {/* === RINGKASAN TAB === */}
      {tab === "ringkasan" && (
        <div className="space-y-6">
          {/* Hero Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-background border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-lg bg-green-50">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                {revenueGrowth != null && (
                  <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${revenueGrowth >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {revenueGrowth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {Math.abs(revenueGrowth)}%
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold tracking-tight">{formatRupiahShort(revenueTotal)}</p>
              <p className="text-xs text-muted-foreground mt-1">Pendapatan Platform</p>
              <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                Fee dari {totalCompletedOrders} pesanan selesai
              </p>
            </div>

            <div className="bg-background border rounded-xl p-5">
              <div className="p-2.5 rounded-lg bg-blue-50 inline-flex mb-3">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold tracking-tight">{formatRupiahShort(gmvTotal)}</p>
              <p className="text-xs text-muted-foreground mt-1">Total GMV</p>
              <p className="text-[11px] text-muted-foreground/70 mt-0.5">Gross Merchandise Value</p>
            </div>

            <div className="bg-background border rounded-xl p-5">
              <div className="p-2.5 rounded-lg bg-teal-50 inline-flex mb-3">
                <Wallet className="h-5 w-5 text-teal-600" />
              </div>
              <p className="text-2xl font-bold tracking-tight">
                {xenditBalance !== null ? formatRupiahShort(xenditBalance) : "N/A"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Saldo Xendit</p>
              <p className="text-[11px] text-muted-foreground/70 mt-0.5">Tersedia untuk pencairan</p>
            </div>

            <div className="bg-background border rounded-xl p-5">
              <div className="p-2.5 rounded-lg bg-purple-50 inline-flex mb-3">
                <CircleDollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <p className="text-2xl font-bold tracking-tight">{formatRupiahShort(totalWithdrawn)}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Dicairkan</p>
              <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                Fee penarikan: {formatRupiahShort(totalWithdrawalFees)}
              </p>
            </div>
          </div>

          {/* Monthly Breakdown */}
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-background border rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-4">Pendapatan Bulan Ini</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-2xl font-bold">{formatRupiahShort(revenueThisMonth)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Revenue</p>
                  {revenueGrowth != null && (
                    <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium mt-1 ${revenueGrowth >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {revenueGrowth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(revenueGrowth)}% vs bulan lalu
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-2xl font-bold">{ordersThisMonth}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Pesanan</p>
                  {orderGrowth != null && (
                    <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium mt-1 ${orderGrowth >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {orderGrowth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(orderGrowth)}% vs bulan lalu
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-background border rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-4">Status Pencairan</h3>
              <div className="space-y-3">
                {pendingCount > 0 && (
                  <Link
                    href="/admin/withdrawals?tab=pencairan&status=PENDING"
                    className="flex items-center justify-between p-3 rounded-lg bg-yellow-50/50 border border-yellow-200/50 hover:bg-yellow-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium">{pendingCount} menunggu persetujuan</span>
                    </div>
                    <span className="text-sm font-bold text-yellow-700">{formatRupiahShort(totalPendingAmount)}</span>
                  </Link>
                )}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Total dicairkan</p>
                    <p className="font-bold text-green-600">{formatRupiahShort(totalWithdrawn)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Fee penarikan terkumpul</p>
                    <p className="font-bold">{formatRupiahShort(totalWithdrawalFees)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === TRANSAKSI TAB === */}
      {tab === "transaksi" && (
        <div className="space-y-4">
          {/* Search */}
          <form method="GET">
            <input type="hidden" name="tab" value="transaksi" />
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Cari invoice, pembeli, atau toko..."
                className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </form>

          <div className="bg-background border rounded-xl overflow-hidden">
            {recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground p-8 text-center">
                {q ? `Tidak ada transaksi dengan kata kunci "${q}"` : "Belum ada transaksi selesai."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Invoice</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Pembeli</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Toko</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Fee Platform</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Bagian Penjual</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Selesai</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs">
                          {order.invoiceNumber || order.xenditRefId || order.id.slice(0, 8)}
                        </td>
                        <td className="px-4 py-3">{order.buyer.fullName}</td>
                        <td className="px-4 py-3">{order.items[0]?.product?.umkm?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-right">{formatRupiah(order.totalAmount)}</td>
                        <td className="px-4 py-3 text-right text-green-600 font-medium">
                          {formatRupiah(order.platformFee)}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {formatRupiah(order.sellerAmount)}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                          {formatDateShort(order.completedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* === PENCAIRAN TAB === */}
      {tab === "pencairan" && (
        <div className="space-y-4">
          {/* Status filter pills */}
          <div className="flex gap-1.5 flex-wrap">
            {withdrawalStatusTabs.map((st) => (
              <Link
                key={st.key}
                href={
                  st.key === "ALL"
                    ? "/admin/withdrawals?tab=pencairan"
                    : `/admin/withdrawals?tab=pencairan&status=${st.key}`
                }
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  statusFilter === st.key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-muted"
                }`}
              >
                {st.label}
              </Link>
            ))}
          </div>

          <div className="bg-background border rounded-xl overflow-hidden">
            {withdrawals.length === 0 ? (
              <p className="text-sm text-muted-foreground p-8 text-center">
                Tidak ada pencairan{statusFilter !== "ALL" ? ` dengan status "${STATUS_LABELS[statusFilter] || statusFilter}"` : ""}.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Penjual</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">UMKM</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Jumlah</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Fee</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Diterima</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Bank</th>
                      <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Tanggal</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {withdrawals.map((w) => (
                      <tr key={w.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium">{w.seller.fullName}</p>
                          <p className="text-xs text-muted-foreground">{w.seller.email ?? ""}</p>
                        </td>
                        <td className="px-4 py-3 text-sm">{w.umkm.name}</td>
                        <td className="px-4 py-3 text-right">{formatRupiah(w.amount)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {formatRupiah(w.withdrawalFee)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{formatRupiah(w.netAmount)}</td>
                        <td className="px-4 py-3">
                          <p className="text-xs">{w.bankName}</p>
                          <p className="text-xs text-muted-foreground">
                            {w.bankAccountNumber} a/n {w.bankAccountName}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[w.status] ?? "bg-gray-100 text-gray-600"}`}>
                            {STATUS_LABELS[w.status] ?? w.status}
                          </span>
                          {w.rejectedReason && (
                            <p className="text-[10px] text-red-500 mt-1">{w.rejectedReason}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                          {formatDate(w.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {["PENDING", "PROCESSING"].includes(w.status) && <WithdrawalActions withdrawalId={w.id} status={w.status} />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
