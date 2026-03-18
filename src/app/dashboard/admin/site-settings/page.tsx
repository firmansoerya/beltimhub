import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { SiteSettingsForm } from "./SiteSettingsForm";

export default async function SiteSettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { role: true } });
  if (!user || user.role !== "ADMIN") redirect("/dashboard");

  const settings = await getSiteSettings();

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold mb-1">Pengaturan Situs</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Data brand yang tampil di header, footer, dan pesan WhatsApp pada e-voucher dan invoice.
      </p>
      <SiteSettingsForm initial={settings} />
    </div>
  );
}
