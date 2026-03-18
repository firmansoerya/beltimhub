import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PengaturanForm } from "../../(member)/pengaturan/PengaturanForm";

export default async function OrganizerPengaturanPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { newsletterEnabled: true },
  });

  return (
    <div>
      <div className="sticky top-0 z-20 bg-background -mx-6 md:-mx-8 px-6 md:px-8 py-5 border-b mb-8">
        <h1 className="text-xl font-bold mb-0.5">Pengaturan</h1>
        <p className="text-sm text-muted-foreground">Kelola preferensi dan keamanan akun kreator kamu</p>
      </div>
      <div className="max-w-2xl">
        <PengaturanForm newsletterEnabled={user?.newsletterEnabled ?? false} />
      </div>
    </div>
  );
}
