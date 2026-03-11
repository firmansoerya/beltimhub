import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { UserRoleBadge } from "../UserRoleBadge";
import { Search } from "lucide-react";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!dbUser || (dbUser.role !== "ADMIN" && dbUser.role !== "MODERATOR")) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const q = params.q;

  const users = await prisma.user.findMany({
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
  });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Manajemen User</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {users.length} pengguna terdaftar
        </p>
      </div>

      {/* Search */}
      <form method="GET" className="mb-4">
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

      <div className="bg-background border rounded-xl overflow-hidden">
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
                  {user._count.listings > 0 && (
                    <span className="mr-2">{user._count.listings} iklan</span>
                  )}
                  {user._count.events > 0 && (
                    <span className="mr-2">{user._count.events} event</span>
                  )}
                  {user._count.umkm > 0 && (
                    <span className="mr-2">{user._count.umkm} UMKM</span>
                  )}
                  {user._count.jobListings > 0 && (
                    <span>{user._count.jobListings} loker</span>
                  )}
                  {!user._count.listings && !user._count.events && !user._count.umkm && !user._count.jobListings && "—"}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
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
    </div>
  );
}
