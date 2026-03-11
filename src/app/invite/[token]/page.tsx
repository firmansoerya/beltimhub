import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ShieldCheck, XCircle, CheckCircle2 } from "lucide-react";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const invitation = await prisma.moderatorInvitation.findUnique({
    where: { token },
    include: { invitedBy: { select: { fullName: true } } },
  });

  // Token tidak ditemukan
  if (!invitation) {
    return <InviteStatus icon="error" title="Link Tidak Valid" message="Link undangan ini tidak ditemukan atau sudah tidak berlaku." />;
  }

  // Token sudah dipakai
  if (invitation.usedAt) {
    return <InviteStatus icon="success" title="Undangan Sudah Digunakan" message={`Link ini sudah digunakan oleh ${invitation.usedByName ?? "pengguna lain"}.`} />;
  }

  // Token kedaluwarsa
  if (invitation.expiresAt < new Date()) {
    return <InviteStatus icon="error" title="Link Kedaluwarsa" message="Link undangan ini sudah tidak berlaku. Minta admin untuk mengirim ulang undangan." />;
  }

  // Cek apakah user sudah login
  const { userId } = await auth();

  if (userId) {
    // User sudah login — proses undangan
    const clerkUser = await currentUser();
    const fullName =
      clerkUser?.fullName ||
      `${clerkUser?.firstName ?? ""} ${clerkUser?.lastName ?? ""}`.trim() ||
      "Moderator";

    // Upsert user dan set role MODERATOR
    await prisma.user.upsert({
      where: { clerkId: userId },
      create: {
        clerkId: userId,
        fullName,
        email: clerkUser?.emailAddresses[0]?.emailAddress,
        avatarUrl: clerkUser?.imageUrl,
        role: "MODERATOR",
      },
      update: { role: "MODERATOR" },
    });

    // Tandai undangan sebagai sudah dipakai
    await prisma.moderatorInvitation.update({
      where: { token },
      data: { usedAt: new Date(), usedByName: fullName },
    });

    // Redirect ke panel admin
    redirect("/admin");
  }

  // User belum login — tampilkan halaman undangan dengan tombol login/daftar
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const redirectUrl = `${appUrl}/invite/${token}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="bg-background border rounded-2xl p-8 max-w-md w-full text-center shadow-sm">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="h-7 w-7 text-primary" />
        </div>

        <h1 className="text-xl font-bold mb-2">Undangan Moderator</h1>
        <p className="text-sm text-muted-foreground mb-1">
          <span className="font-medium text-foreground">{invitation.invitedBy.fullName}</span>{" "}
          mengundang Anda untuk bergabung sebagai{" "}
          <span className="font-medium text-foreground">Moderator</span> di BeltimHub.
        </p>
        <p className="text-xs text-muted-foreground mb-6">
          Berlaku hingga{" "}
          {invitation.expiresAt.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>

        <div className="space-y-3">
          <SignUpButton mode="redirect" forceRedirectUrl={redirectUrl}>
            <Button className="w-full">Daftar & Terima Undangan</Button>
          </SignUpButton>
          <SignInButton mode="redirect" forceRedirectUrl={redirectUrl}>
            <Button variant="outline" className="w-full">
              Sudah punya akun? Masuk
            </Button>
          </SignInButton>
        </div>

        <p className="text-xs text-muted-foreground mt-5">
          Setelah masuk, Anda otomatis ditetapkan sebagai Moderator.
        </p>
      </div>
    </div>
  );
}

function InviteStatus({
  icon,
  title,
  message,
}: {
  icon: "success" | "error";
  title: string;
  message: string;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="bg-background border rounded-2xl p-8 max-w-sm w-full text-center shadow-sm">
        {icon === "success" ? (
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
        ) : (
          <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        )}
        <h1 className="text-lg font-bold mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
