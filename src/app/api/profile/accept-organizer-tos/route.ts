import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.user.update({
    where: { clerkId: userId },
    data: { organizerTosAcceptedAt: new Date() },
  });

  revalidatePath("/dashboard/organizer", "layout");

  return NextResponse.json({ ok: true });
}
