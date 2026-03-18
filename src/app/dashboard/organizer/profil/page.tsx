import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OrganizerProfilForm } from "./OrganizerProfilForm";

export default async function OrganizerProfilPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: {
      fullName: true,
      email: true,
      avatarUrl: true,
      organizerLogoUrl: true,
      organizerPhone: true,
      organizerBio: true,
      organizerAddress: true,
      organizerBannerUrl: true,
      twitterUsername: true,
      instagramUsername: true,
      facebookUrl: true,
      tiktokUsername: true,
    },
  });

  if (!user) redirect("/sign-in");

  return (
    <div>
      <div className="sticky top-0 z-20 bg-background -mx-6 md:-mx-8 px-6 md:px-8 py-5 border-b mb-8">
        <h1 className="text-xl font-bold mb-0.5">Informasi Dasar</h1>
        <p className="text-sm text-muted-foreground">Informasi profil yang ditampilkan di halaman penyelenggaramu</p>
      </div>
      <div className="max-w-2xl">
      <OrganizerProfilForm
        fullName={user.fullName}
        email={user.email ?? ""}
        avatarUrl={user.avatarUrl ?? null}
        organizerLogoUrl={user.organizerLogoUrl ?? null}
        organizerPhone={user.organizerPhone ?? null}
        organizerBio={user.organizerBio ?? null}
        organizerAddress={user.organizerAddress ?? null}
        organizerBannerUrl={user.organizerBannerUrl ?? null}
        twitterUsername={user.twitterUsername ?? null}
        instagramUsername={user.instagramUsername ?? null}
        facebookUrl={user.facebookUrl ?? null}
        tiktokUsername={user.tiktokUsername ?? null}
      />
      </div>
    </div>
  );
}
