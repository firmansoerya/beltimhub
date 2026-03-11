import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Users, BadgeCheck, Clock, ShieldCheck } from "lucide-react";

export default async function AdminOverviewPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!dbUser || (dbUser.role !== "ADMIN" && dbUser.role !== "MODERATOR")) {
    redirect("/dashboard");
  }

  const [totalUsers, verifiedUsers, pendingVerifications, totalAdmins] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isVerified: true } }),
      prisma.verificationRequest.count({ where: { status: "PENDING" } }),
      prisma.user.count({ where: { role: { in: ["ADMIN", "MODERATOR"] } } }),
    ]);

  const stats = [
    {
      label: "Total Pengguna",
      value: totalUsers,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Terverifikasi",
      value: verifiedUsers,
      icon: BadgeCheck,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Menunggu Verifikasi",
      value: pendingVerifications,
      icon: Clock,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
      href: "/admin/verifikasi",
    },
    {
      label: "Admin & Moderator",
      value: totalAdmins,
      icon: ShieldCheck,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Statistik pengguna BeltimHub
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-background border rounded-xl p-5">
            <div className={`inline-flex p-2.5 rounded-lg ${bg} mb-3`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
