import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ transferId: string }> }
) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { transferId } = await params;
  const { action } = await req.json(); // "accept" | "decline"

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });

  const transfer = await prisma.ticketTransfer.findUnique({
    where: { id: transferId },
    include: { ticket: { select: { id: true, userId: true } } },
  });

  if (!transfer || transfer.toUserId !== user.id) {
    return NextResponse.json({ error: "Transfer tidak ditemukan." }, { status: 404 });
  }
  if (transfer.status !== "PENDING") {
    return NextResponse.json({ error: "Transfer sudah diproses." }, { status: 400 });
  }

  if (action === "accept") {
    await prisma.$transaction([
      prisma.ticketTransfer.update({
        where: { id: transferId },
        data: { status: "ACCEPTED", acceptedAt: new Date() },
      }),
      prisma.ticket.update({
        where: { id: transfer.ticketId },
        data: { userId: user.id },
      }),
    ]);
    revalidatePath("/dashboard/tiket", "page");
  } else if (action === "decline") {
    await prisma.ticketTransfer.update({
      where: { id: transferId },
      data: { status: "DECLINED" },
    });
    revalidatePath("/dashboard/tiket", "page");
  } else {
    return NextResponse.json({ error: "Action tidak valid." }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
