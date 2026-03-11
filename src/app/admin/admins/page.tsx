import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { ChangeRoleButton } from "./ChangeRoleButton";
import { InviteModeratorForm } from "./InviteModeratorForm";
import { Clock, CheckCircle2 } from "lucide-react";

export default async function AdminAdminsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/admin");

  const [admins, invitations] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ["ADMIN", "MODERATOR"] } },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isVerified: true,
        clerkId: true,
      },
    }),
    prisma.moderatorInvitation.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        phone: true,
        usedAt: true,
        usedByName: true,
        expiresAt: true,
        createdAt: true,
      },
    }),
  ]);

  const now = new Date();

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Manajemen Admin</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kelola admin dan moderator BeltimHub
        </p>
      </div>

      {/* Admin & Moderator aktif */}
      <div>
        <h2 className="font-semibold mb-3">Admin & Moderator Aktif</h2>
        <div className="bg-background border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nama</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {admins.map((user) => {
                const isSelf = user.clerkId === dbUser.clerkId;
                return (
                  <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{user.fullName}</span>
                        {user.isVerified && <VerifiedBadge />}
                        {isSelf && (
                          <span className="text-[10px] text-muted-foreground">(Anda)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {user.email ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          user.role === "ADMIN"
                            ? "bg-red-100 text-red-700"
                            : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!isSelf && (
                        <ChangeRoleButton
                          userId={user.id}
                          currentRole={user.role}
                          options={
                            user.role === "MODERATOR"
                              ? [
                                  { label: "Jadikan Admin", role: "ADMIN" },
                                  { label: "Cabut Akses", role: "MEMBER" },
                                ]
                              : [{ label: "Turunkan ke Moderator", role: "MODERATOR" }]
                          }
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Undang Moderator */}
      <div>
        <h2 className="font-semibold mb-1">Undang Moderator Baru</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Kirim link undangan via WhatsApp. Penerima cukup klik link tersebut, sign in/daftar
          seperti biasa, dan otomatis menjadi Moderator.
        </p>
        <InviteModeratorForm />
      </div>

      {/* Riwayat undangan */}
      {invitations.length > 0 && (
        <div>
          <h2 className="font-semibold mb-3">Riwayat Undangan</h2>
          <div className="space-y-2">
            {invitations.map((inv) => {
              const expired = inv.expiresAt < now && !inv.usedAt;
              return (
                <div
                  key={inv.id}
                  className="flex items-center justify-between gap-4 bg-background border rounded-xl px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{inv.phone ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      Dikirim{" "}
                      {new Date(inv.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {inv.usedAt ? (
                      <div className="flex items-center gap-1.5 text-xs text-green-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Diterima oleh {inv.usedByName ?? "pengguna"}</span>
                      </div>
                    ) : expired ? (
                      <span className="text-xs text-muted-foreground">Kedaluwarsa</span>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-yellow-600">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Menunggu</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
