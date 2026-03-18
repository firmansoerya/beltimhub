import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Users, CalendarDays } from "lucide-react";

export default async function KelolaAksesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, fullName: true, email: true, role: true },
  });

  if (!user) redirect("/sign-in");

  const events = await prisma.event.findMany({
    where: { organizerId: user.id },
    select: { id: true, title: true, quota: true, eventDate: true, status: true },
    orderBy: { eventDate: "desc" },
  });

  return (
    <div>
      <div className="sticky top-0 z-20 bg-background -mx-6 md:-mx-8 px-6 md:px-8 py-5 border-b mb-8">
        <h1 className="text-xl font-bold mb-0.5">Kelola Akses</h1>
        <p className="text-sm text-muted-foreground">Kelola pengguna dan akses event</p>
      </div>

      {/* Pengguna */}
      <div className="bg-background border rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Users className="h-4 w-4" /> Pengguna
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Nama</th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Email</th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Peran</th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b last:border-0">
              <td className="px-5 py-3 font-medium">{user.fullName}</td>
              <td className="px-5 py-3 text-muted-foreground">{user.email}</td>
              <td className="px-5 py-3">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {user.role === "ADMIN" ? "Admin" : "Kreator"}
                </span>
              </td>
              <td className="px-5 py-3">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  Aktif
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Event */}
      <div className="bg-background border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Event
          </h2>
        </div>
        {events.length === 0 ? (
          <div className="px-5 py-10 text-center text-muted-foreground text-sm">
            Daftar event kamu masih kosong, buat event untuk memulainya
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Nama Event</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Kapasitas</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Tanggal Event</th>
              </tr>
            </thead>
            <tbody>
              {events.map(event => (
                <tr key={event.id} className="border-b last:border-0">
                  <td className="px-5 py-3 font-medium">{event.title}</td>
                  <td className="px-5 py-3 text-muted-foreground">{event.quota}</td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {new Date(event.eventDate).toLocaleDateString("id-ID", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
