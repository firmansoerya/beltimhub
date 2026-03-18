import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LegalForm } from "./LegalForm";

export default async function OrganizerLegalPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: {
      id: true,
      legalDoc: {
        select: {
          docType: true,
          ktpNumber: true, ktpName: true, ktpAddress: true, ktpImageUrl: true,
          npwpNumber: true, npwpName: true, npwpAddress: true, npwpImageUrl: true,
          adNumber: true, adName: true, adAddress: true, adImageUrl: true,
          nibNumber: true,
          status: true,
        },
      },
    },
  });

  if (!user) redirect("/sign-in");

  return (
    <div>
      <div className="sticky top-0 z-20 bg-background -mx-6 md:-mx-8 px-6 md:px-8 py-5 border-b mb-8">
        <h1 className="text-xl font-bold mb-0.5">Informasi Legal</h1>
        <p className="text-sm text-muted-foreground">Unggah dokumen identitas untuk verifikasi akun kreator</p>
      </div>
      <div className="max-w-3xl">
        <LegalForm existing={user.legalDoc} />
      </div>
    </div>
  );
}
