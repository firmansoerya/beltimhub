import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { VerifyUserButton } from "./VerifyUserButton";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { ReviewRequestButtons } from "./ReviewRequestButtons";
import { getSignedUrl } from "@/lib/supabase-storage";
import { Clock } from "lucide-react";

export default async function AdminPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const admin = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!admin || admin.role !== "ADMIN") redirect("/dashboard");

  const [pendingRequests, users] = await Promise.all([
    prisma.verificationRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { fullName: true, email: true } },
      },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isVerified: true,
        createdAt: true,
      },
    }),
  ]);

  // Generate signed URLs untuk semua dokumen (berlaku 1 jam)
  const requestsWithSignedUrls = await Promise.all(
    pendingRequests.map(async (req) => ({
      ...req,
      ktpSignedUrl: await getSignedUrl(req.ktpUrl),
      selfieSignedUrl: await getSignedUrl(req.selfieUrl),
    }))
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manajemen User</h1>
          <p className="text-sm text-muted-foreground mt-1">Kelola verifikasi pengguna BeltimHub</p>
        </div>
        <a
          href="/dashboard/admin/site-settings"
          className="text-sm border rounded-md px-4 py-2 hover:bg-muted transition-colors"
        >
          Pengaturan Situs
        </a>
      </div>

      {/* Antrian Permohonan Verifikasi */}
      {pendingRequests.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-yellow-600" />
            <h2 className="font-semibold">Permohonan Menunggu Review</h2>
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
              {pendingRequests.length}
            </span>
          </div>
          <div className="space-y-3">
            {requestsWithSignedUrls.map((req) => (
              <div key={req.id} className="bg-background border rounded-xl p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1">
                    <p className="font-medium">{req.user.fullName}</p>
                    <p className="text-sm text-muted-foreground">{req.user.email ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      Diajukan:{" "}
                      {new Date(req.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  {/* Foto dokumen (signed URL, berlaku 1 jam) */}
                  <div className="flex gap-3">
                    <a href={req.ktpSignedUrl} target="_blank" rel="noopener noreferrer">
                      <div className="w-28 h-18 rounded-lg overflow-hidden border bg-muted hover:opacity-90 transition-opacity">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={req.ktpSignedUrl} alt="KTP" className="w-28 h-20 object-cover" />
                        <p className="text-[10px] text-center text-muted-foreground py-0.5">KTP</p>
                      </div>
                    </a>
                    <a href={req.selfieSignedUrl} target="_blank" rel="noopener noreferrer">
                      <div className="w-28 rounded-lg overflow-hidden border bg-muted hover:opacity-90 transition-opacity">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={req.selfieSignedUrl} alt="Selfie" className="w-28 h-20 object-cover" />
                        <p className="text-[10px] text-center text-muted-foreground py-0.5">Selfie + KTP</p>
                      </div>
                    </a>
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
                  <ReviewRequestButtons requestId={req.id} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daftar Semua User */}
      <div>
        <h2 className="font-semibold mb-3">Semua Pengguna</h2>
        <div className="bg-background border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nama</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Aksi</th>
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
                  <td className="px-4 py-3 text-muted-foreground">{user.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.isVerified ? (
                      <span className="text-xs text-blue-600 font-medium">Terverifikasi</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Belum</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <VerifyUserButton userId={user.id} isVerified={user.isVerified} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
