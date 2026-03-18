import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BeralihKreatorForm } from "./BeralihKreatorForm";

export default async function BeralihKreatorPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { role: true, phoneNumber: true, email: true, fullName: true },
  });

  if (!user) redirect("/sign-in");

  // Sudah organizer, langsung redirect
  if (user.role === "ORGANIZER" || user.role === "ADMIN") {
    redirect("/dashboard/organizer");
  }

  return (
    <div>
      <div className="sticky top-0 z-20 bg-background -mx-6 md:-mx-8 px-6 md:px-8 py-5 border-b mb-8">
        <h1 className="text-xl font-bold mb-0.5">Beralih ke Akun Kreator</h1>
        <p className="text-sm text-muted-foreground">
          Sebagai kreator, kamu bisa membuat dan mengelola event di BeltimHub.
        </p>
      </div>
      <div className="max-w-lg">
      <BeralihKreatorForm
        phoneNumber={user.phoneNumber ?? ""}
        email={user.email ?? ""}
        fullName={user.fullName}
      />
      </div>
    </div>
  );
}
