import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProfilForm } from "./ProfilForm";

export default async function ProfilPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  let user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: {
      id: true, fullName: true, firstName: true, lastName: true,
      nickname: true,
      email: true, avatarUrl: true, phoneNumber: true,
      birthDate: true, role: true, isVerified: true,
    },
  });

  if (!user) {
    const clerkUser = await currentUser();
    if (!clerkUser) redirect("/sign-in");
    const fullName = clerkUser.fullName || `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || "User";
    user = await prisma.user.create({
      data: {
        clerkId: userId,
        fullName,
        firstName: clerkUser.firstName ?? undefined,
        lastName: clerkUser.lastName ?? undefined,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        avatarUrl: clerkUser.imageUrl,
      },
      select: {
        id: true, fullName: true, firstName: true, lastName: true,
        nickname: true,
        email: true, avatarUrl: true, phoneNumber: true,
        birthDate: true, role: true, isVerified: true,
      },
    });
  }

  return (
    <div className="pb-20">
      <div className="sticky top-0 z-20 bg-background -mx-6 md:-mx-8 px-6 md:px-8 py-5 border-b mb-8">
        <h1 className="text-xl font-bold mb-0.5">Profil Saya</h1>
        <p className="text-sm text-muted-foreground">Informasi akun dan data pribadi kamu</p>
      </div>
      <div className="max-w-2xl">
      <ProfilForm
        fullName={user.fullName}
        firstName={user.firstName ?? ""}
        lastName={user.lastName ?? ""}
        nickname={user.nickname ?? null}
        email={user.email ?? ""}
        avatarUrl={user.avatarUrl ?? null}
        phoneNumber={user.phoneNumber ?? null}
        birthDate={user.birthDate?.toISOString() ?? null}
        isVerified={user.isVerified}
      />
      </div>
    </div>
  );
}
