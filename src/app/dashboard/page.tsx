import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ProfileCard } from "./ProfileCard";
import { Package, Building2, Briefcase, CalendarDays, Plus, ChevronRight } from "lucide-react";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  let user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { verificationRequest: { select: { status: true } } },
  });
  if (!user) {
    const clerkUser = await currentUser();
    if (!clerkUser) redirect("/sign-in");
    const fullName =
      clerkUser.fullName ||
      `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() ||
      "User";
    await prisma.user.create({
      data: {
        clerkId: userId,
        fullName,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        avatarUrl: clerkUser.imageUrl,
      },
    });
    user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { verificationRequest: { select: { status: true } } },
    });
  }
  if (!user) redirect("/sign-in");

  const [listingCount, umkmCount, lokerCount, eventCount] = await Promise.all([
    prisma.listing.count({ where: { sellerId: user.id, status: { not: "DELETED" } } }),
    prisma.umkm.count({ where: { ownerId: user.id } }),
    prisma.jobListing.count({ where: { posterId: user.id } }),
    prisma.event.count({ where: { organizerId: user.id } }),
  ]);

  const overviews = [
    {
      label: "Iklan FJB",
      count: listingCount,
      icon: Package,
      color: "text-orange-500",
      bg: "bg-orange-50",
      href: "/dashboard/saya",
      newHref: "/fjb/buat",
      newLabel: "Pasang iklan",
      empty: "Belum ada iklan yang Anda pasang",
    },
    {
      label: "UMKM",
      count: umkmCount,
      icon: Building2,
      color: "text-teal-600",
      bg: "bg-teal-50",
      href: "/dashboard/saya",
      newHref: "/umkm/tambah",
      newLabel: "Daftarkan UMKM",
      empty: "Belum ada UMKM yang Anda daftarkan",
    },
    {
      label: "Lowongan",
      count: lokerCount,
      icon: Briefcase,
      color: "text-purple-600",
      bg: "bg-purple-50",
      href: "/dashboard/saya",
      newHref: "/loker/buat",
      newLabel: "Posting loker",
      empty: "Belum ada lowongan yang Anda posting",
    },
    {
      label: "Event",
      count: eventCount,
      icon: CalendarDays,
      color: "text-primary",
      bg: "bg-primary/10",
      href: "/dashboard/organizer",
      newHref: "/dashboard/organizer",
      newLabel: "Buat event",
      empty: "Belum ada event yang Anda buat",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Halaman Saya</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Selamat datang kembali, {user.fullName.split(" ")[0]}!
        </p>
      </div>

      <div className="grid md:grid-cols-[280px_1fr] gap-6 items-start">
        {/* Profil */}
        <ProfileCard
          fullName={user.fullName}
          email={user.email ?? null}
          avatarUrl={user.avatarUrl ?? null}
          phoneNumber={user.phoneNumber ?? null}
          role={user.role}
          isVerified={user.isVerified}
          verificationStatus={(user.verificationRequest?.status === "PENDING" || user.verificationRequest?.status === "REJECTED") ? user.verificationRequest.status : null}
        />

        {/* Overview */}
        <div className="grid sm:grid-cols-2 gap-4">
          {overviews.map(({ label, count, icon: Icon, color, bg, href, newHref, newLabel, empty }) => (
            <div key={label} className="bg-background border rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg ${bg}`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  <span className="font-medium text-sm">{label}</span>
                </div>
                <Link href={href} className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Lihat semua
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {count > 0 ? (
                <div>
                  <p className="text-3xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {label === "Event" ? "event dibuat" : label === "UMKM" ? "UMKM terdaftar" : label === "Lowongan" ? "lowongan aktif" : "iklan dipasang"}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{empty}</p>
              )}

              <Link
                href={newHref}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline mt-auto"
              >
                <Plus className="h-3.5 w-3.5" />
                {newLabel}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
