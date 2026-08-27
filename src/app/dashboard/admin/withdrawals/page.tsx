import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getXenditBalance } from "@/lib/xendit-disbursement";
import { WithdrawalActions } from "./WithdrawalActions";
import Link from "next/link";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  FAILED: "Failed",
  REJECTED: "Rejected",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PROCESSING: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  REJECTED: "bg-gray-100 text-gray-600",
};

function formatRupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
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

export default async function AdminWithdrawalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const admin = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!admin || admin.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const statusFilter = params.status || "ALL";

  // Fetch Xendit balance (may fail if no API key)
  let xenditBalance: number | null = null;
  try {
    const balanceData = await getXenditBalance();
    xenditBalance = balanceData.balance;
  } catch {
    xenditBalance = null;
  }

  // Fetch all withdrawals with seller/umkm info
  const withdrawalWhere = statusFilter !== "ALL" ? { status: statusFilter as any } : {};
  const [withdrawals, aggregates, recentOrders] = await Promise.all([
    prisma.sellerWithdrawal.findMany({
      where: withdrawalWhere,
      orderBy: { createdAt: "desc" },
      include: {
        seller: { select: { fullName: true, email: true } },
        umkm: { select: { name: true } },
      },
    }),
    prisma.sellerWithdrawal.groupBy({
      by: ["status"],
      _sum: { netAmount: true },
      _count: true,
    }),
    // Recent completed marketplace orders (source of Xendit balance)
    prisma.marketplaceOrder.findMany({
      where: { orderStatus: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take: 20,
      select: {
        id: true,
        invoiceNumber: true,
        xenditRefId: true,
        totalAmount: true,
        platformFee: true,
        sellerAmount: true,
        completedAt: true,
        buyer: { select: { fullName: true } },
        seller: { select: { fullName: true } },
      },
    }),
  ]);

  const totalCompleted = aggregates.find((a) => a.status === "COMPLETED")?._sum.netAmount ?? 0;
  const totalPending = aggregates.find((a) => a.status === "PENDING")?._sum.netAmount ?? 0;
  const totalProcessing = aggregates.find((a) => a.status === "PROCESSING")?._sum.netAmount ?? 0;
  const pendingCount = aggregates.find((a) => a.status === "PENDING")?._count ?? 0;

  const tabs = [
    { key: "ALL", label: "Semua" },
    { key: "PENDING", label: "Pending" },
    { key: "PROCESSING", label: "Processing" },
    { key: "COMPLETED", label: "Completed" },
    { key: "FAILED", label: "Failed" },
    { key: "REJECTED", label: "Rejected" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pencairan Dana</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola penarikan dana penjual dari Pasar Lokal
          </p>
        </div>
        <Link
          href="/dashboard/admin"
          className="text-sm border rounded-md px-4 py-2 hover:bg-muted transition-colors"
        >
          Kembali
        </Link>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-background border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Saldo Xendit</p>
          <p className="text-2xl font-bold mt-1">
            {xenditBalance !== null ? formatRupiah(xenditBalance) : "N/A"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Saldo tersedia di Xendit</p>
        </div>
        <div className="bg-background border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Total Dicairkan</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{formatRupiah(totalCompleted)}</p>
          <p className="text-xs text-muted-foreground mt-1">Total dana yang sudah dicairkan</p>
        </div>
        <div className="bg-background border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Penarikan Pending</p>
          <p className="text-2xl font-bold mt-1 text-yellow-600">
            {formatRupiah(totalPending + totalProcessing)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {pendingCount} permintaan menunggu
          </p>
        </div>
      </div>

      {/* Sumber Dana / Riwayat Masuk */}
      <div>
        <h2 className="font-semibold mb-3">Sumber Dana / Riwayat Masuk</h2>
        <p className="text-sm text-muted-foreground mb-3">
          20 order terakhir yang sudah selesai (COMPLETED) — sumber dana di Xendit
        </p>
        <div className="bg-background border rounded-xl overflow-hidden">
          {recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">Belum ada order selesai.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Invoice</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Pembeli</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Penjual</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Fee</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Seller Amount</th>
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
                      <td className="px-4 py-3">{order.seller.fullName}</td>
                      <td className="px-4 py-3 text-right">{formatRupiah(order.totalAmount)}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {formatRupiah(order.platformFee)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatRupiah(order.sellerAmount)}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                        {formatDate(order.completedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Daftar Penarikan */}
      <div>
        <h2 className="font-semibold mb-3">Daftar Penarikan</h2>

        {/* Status Tabs */}
        <div className="flex gap-1 mb-4 flex-wrap">
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={
                tab.key === "ALL"
                  ? "/dashboard/admin/withdrawals"
                  : `/dashboard/admin/withdrawals?status=${tab.key}`
              }
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                statusFilter === tab.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-muted"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        <div className="bg-background border rounded-xl overflow-hidden">
          {withdrawals.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">
              Tidak ada penarikan{statusFilter !== "ALL" ? ` dengan status ${statusFilter}` : ""}.
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
                      <td className="px-4 py-3">{w.umkm.name}</td>
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
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            STATUS_COLORS[w.status] ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
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
                        {w.status === "PENDING" && <WithdrawalActions withdrawalId={w.id} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
