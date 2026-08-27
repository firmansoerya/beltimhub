import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function KalkulatorPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="-mx-4 md:-mx-8 -mt-4 md:-mt-6">
      <iframe
        src="/kalkulator-pendapatan.html"
        className="w-full border-0"
        style={{ height: "calc(100vh - 60px)", minHeight: "800px" }}
        title="Kalkulator Simulasi Pendapatan"
      />
    </div>
  );
}
