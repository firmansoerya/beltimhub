import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { UserRoleBadge } from "../UserRoleBadge";
import { ReviewRequestButtons } from "../verifikasi/ReviewRequestButtons";
import { getSignedUrl } from "@/lib/supabase-storage";
import { Search, Clock, CheckCircle2, XCircle, Users as UsersIcon } from "lucide-react";

const VERIFY_TABS = ["PENDING", "APPROVED", "REJECTED"] as const;
type VerifyTab = (typeof VERIFY_TABS)[number];
const ALL_TABS = [...VERIFY_TABS, "users"] as const;
type Tab = (typeof ALL_TABS)[number];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!dbUser || (dbUser.role !== "ADMIN" && dbUser.role !== "MODERATOR")) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const q = params.q;
  const tab: Tab = ALL_TABS.includes(params.tab as Tab) ? (params.tab as Tab) : "PENDING";
  const isUsersTab = tab === "users";
  const isVerifyTab = !isUsersTab;

  // Fetch verification data only on verify tabs
  const [verificationRequests, pendingCount, approvedCount, rejectedCount] = isVerifyTab
    ? await Promise.all([
        prisma.verificationRequest.findMany({
          where: { status: tab as VerifyTab },
          orderBy: { updatedAt: "desc" },
          include: { user: { select: { fullName: true, email: true } } },
        }),
        prisma.verificationRequest.count({ where: { status: "PENDING" } }),
        prisma.verificationRequest.count({ where: { status: "APPROVED" } }),
        prisma.verificationRequest.count({ where: { status: "REJECTED" } }),
      ])
    : [[], 0, 0, 0];

  // Fetch user list only on users tab
  const users = isUsersTab
    ? await prisma.user.findMany({
        where: q
          ? {
              OR: [
                { fullName: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            }
          : undefined,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          isVerified: true,
          createdAt: true,
          _count: {
            select: { listings: true, events: true, umkm: true, jobListings: true },
          },
        },
      })
    : [];

  // Pending count for header (always fetch)
  const totalPending = isVerifyTab
    ? pendingCount
    : await prisma.verificationRequest.count({ where: { status: "PENDING" } });

  // Generate signed URLs for pending requests
  const requestsWithUrls = tab === "PENDING"
    ? await Promise.all(
        verificationRequests.map(async (req) => ({
          ...req,
          ktpSignedUrl: await getSignedUrl(req.ktpUrl),
          selfieSignedUrl: await getSignedUrl(req.selfieUrl),
        }))
      )
    : verificationRequests.map((req) => ({
        ...req,
        ktpSignedUrl: null as string | null,
        selfieSignedUrl: null as string | null,
      }));

  const tabConfig = {
    PENDING: { label: "Menunggu", icon: Clock, color: "text-yellow-600", count: pendingCount },
    APPROVED: { label: "Disetujui", icon: CheckCircle2, color: "text-green-600", count: approvedCount },
    REJECTED: { label: "Ditolak", icon: XCircle, color: "text-red-500", count: rejectedCount },
    users: { label: "Daftar User", icon: UsersIcon, color: "text-blue-600", count: 0 },
  };

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 pb-20">
      {/* Header */}
      <div className="mb-6 pb-4 border-b">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mb-1.5">
          <span>Pengguna</span>
          <span>/</span>
          <span className="text-primary font-semibold">
            {isUsersTab ? "Daftar User" : "Verifikasi Pengguna"}
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {isUsersTab ? "Daftar Pengguna" : "Verifikasi Identitas Pengguna"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isUsersTab
            ? "Kelola semua akun terdaftar di platform BeltimHub"
            : "Review pengajuan verifikasi KTP & identitas pengguna"}
        </p>

        {/* Status tabs specifically for Verifikasi Pengguna (Menunggu, Disetujui, Ditolak) */}
        {isVerifyTab && (
          <div className="flex flex-wrap gap-2 mt-5">
            {VERIFY_TABS.map((t) => {
              const { label, icon: Icon, color, count } = tabConfig[t];
              const isActive = tab === t;
              return (
                <a
                  key={t}
                  href={`/admin/users?tab=${t}`}
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

      {/* Users Tab */}
      {isUsersTab ? (
        <div>
          {/* Search */}
          <div className="mb-4">
            <form method="GET">
              <input type="hidden" name="tab" value="users" />
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Cari nama atau email..."
                  className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </form>
          </div>

          <div className="bg-background border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nama</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Konten</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Bergabung</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">{user.fullName}</span>
                          {user.isVerified && <VerifiedBadge />}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {user.email ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <UserRoleBadge role={user.role} />
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {[
                          user._count.listings > 0 && `${user._count.listings} iklan`,
                          user._count.events > 0 && `${user._count.events} event`,
                          user._count.umkm > 0 && `${user._count.umkm} UMKM`,
                          user._count.jobListings > 0 && `${user._count.jobListings} loker`,
                        ]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(user.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {users.length === 0 && (
              <p className="text-center py-12 text-sm text-muted-foreground">
                {q ? `Tidak ada user dengan kata kunci "${q}"` : "Belum ada pengguna"}
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Verification Tabs */
        <div>
          {requestsWithUrls.length === 0 ? (
            <p className="text-center py-16 text-muted-foreground text-sm">
              Tidak ada permohonan dengan status ini.
            </p>
          ) : (
            <div className="space-y-3">
              {requestsWithUrls.map((req) => (
                <div key={req.id} className="bg-background border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-1">
                      <p className="font-medium">{req.user.fullName}</p>
                      <p className="text-sm text-muted-foreground">{req.user.email ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {tab === "PENDING" ? "Diajukan" : "Diproses"}:{" "}
                        {new Date(tab === "PENDING" ? req.createdAt : req.updatedAt).toLocaleDateString(
                          "id-ID",
                          { day: "numeric", month: "long", year: "numeric" }
                        )}
                      </p>
                      {req.adminNotes && (
                        <p className="text-xs text-red-500">Catatan: {req.adminNotes}</p>
                      )}
                    </div>

                    {/* Document photos */}
                    {tab === "PENDING" && req.ktpSignedUrl && (
                      <div className="flex gap-3">
                        <a href={req.ktpSignedUrl} target="_blank" rel="noopener noreferrer">
                          <div className="w-28 rounded-lg overflow-hidden border bg-muted hover:opacity-90 transition-opacity">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={req.ktpSignedUrl} alt="KTP" className="w-28 h-20 object-cover" />
                            <p className="text-[10px] text-center text-muted-foreground py-0.5">KTP</p>
                          </div>
                        </a>
                        <a href={req.selfieSignedUrl!} target="_blank" rel="noopener noreferrer">
                          <div className="w-28 rounded-lg overflow-hidden border bg-muted hover:opacity-90 transition-opacity">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={req.selfieSignedUrl!} alt="Selfie" className="w-28 h-20 object-cover" />
                            <p className="text-[10px] text-center text-muted-foreground py-0.5">Selfie + KTP</p>
                          </div>
                        </a>
                      </div>
                    )}
                  </div>

                  {tab === "PENDING" && (
                    <div className="mt-3 flex justify-end">
                      <ReviewRequestButtons requestId={req.id} />
                    </div>
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
