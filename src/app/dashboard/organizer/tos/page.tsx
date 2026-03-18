import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TosForm } from "./TosForm";

export default async function OrganizerTosPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { role: true, organizerTosAcceptedAt: true },
  });

  if (!user) redirect("/sign-in");
  if (user.role !== "ORGANIZER" && user.role !== "ADMIN") redirect("/dashboard/beralih-kreator");

  // Sudah terima TOS, langsung ke dashboard
  if (user.organizerTosAcceptedAt) redirect("/dashboard/organizer");

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <TosForm />
    </div>
  );
}
