import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RekeningForm } from "./RekeningForm";

export default async function OrganizerRekeningPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { bankAccount: true },
  });

  if (!user) redirect("/sign-in");

  return (
    <div>
      <div className="sticky top-0 z-20 bg-background -mx-6 md:-mx-8 px-6 md:px-8 py-5 border-b mb-8">
        <h1 className="text-xl font-bold mb-0.5">Rekening</h1>
        <p className="text-sm text-muted-foreground">Rekening bank untuk pencairan hasil penjualan tiket</p>
      </div>
      <div className="max-w-2xl">
        <RekeningForm existing={user.bankAccount} />
      </div>
    </div>
  );
}
