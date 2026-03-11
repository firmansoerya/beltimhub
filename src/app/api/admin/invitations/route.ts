import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsApp } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const phone: string | undefined = body.phone?.trim();

  if (!phone) {
    return NextResponse.json({ error: "Nomor WhatsApp wajib diisi" }, { status: 400 });
  }

  // Token berlaku 7 hari
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invitation = await prisma.moderatorInvitation.create({
    data: {
      phone,
      invitedById: admin.id,
      expiresAt,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://beltim.id";
  const inviteUrl = `${appUrl}/invite/${invitation.token}`;

  // Kirim via WhatsApp
  await sendWhatsApp(
    phone,
    `Halo! Anda diundang oleh ${admin.fullName} untuk menjadi Moderator di *BeltimHub*.\n\nKlik link berikut untuk bergabung:\n${inviteUrl}\n\n_Link berlaku selama 7 hari._`
  );

  return NextResponse.json({ token: invitation.token, inviteUrl });
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invitations = await prisma.moderatorInvitation.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      phone: true,
      usedAt: true,
      usedByName: true,
      expiresAt: true,
      createdAt: true,
      invitedBy: { select: { fullName: true } },
    },
  });

  return NextResponse.json(invitations);
}
