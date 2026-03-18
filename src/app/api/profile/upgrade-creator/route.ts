import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// POST: Konfirmasi upgrade role ke ORGANIZER setelah OTP terverifikasi
// Body: { phone, code }
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { phone, code } = body as { phone?: string; code?: string };

  if (!phone || !code) {
    return NextResponse.json({ error: "Phone dan code diperlukan" }, { status: 400 });
  }

  // Verifikasi OTP
  const otpRecord = await prisma.phoneOtp.findFirst({
    where: { phone, code },
  });

  if (!otpRecord) {
    return NextResponse.json({ error: "Kode OTP tidak valid" }, { status: 400 });
  }

  if (otpRecord.expiresAt < new Date()) {
    await prisma.phoneOtp.delete({ where: { id: otpRecord.id } });
    return NextResponse.json({ error: "Kode OTP sudah kadaluarsa" }, { status: 400 });
  }

  // Hapus OTP setelah dipakai
  await prisma.phoneOtp.delete({ where: { id: otpRecord.id } });

  // Upgrade role ke ORGANIZER
  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

  if (user.role === "ORGANIZER" || user.role === "ADMIN") {
    return NextResponse.json({ ok: true, alreadyOrganizer: true });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: "ORGANIZER" },
  });

  return NextResponse.json({ ok: true });
}
