import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { QrScanner } from "./QrScanner";

export default async function ScanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) redirect("/sign-in");

  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    select: { id: true, title: true, organizerId: true },
  });

  if (!event) notFound();
  if (event.organizerId !== user.id && user.role !== "ADMIN") {
    redirect("/dashboard/organizer");
  }

  return (
    <div className="max-w-md mx-auto">
      <QrScanner eventId={event.id} eventTitle={event.title} />
    </div>
  );
}
