import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const phone: string = body.phone;
  const code: string = body.code;

  if (!phone || !code) {
    return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
  }

  const otp = await prisma.phoneOtp.findFirst({
    where: { phone, code },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    return NextResponse.json({ error: "Kode OTP salah" }, { status: 400 });
  }

  if (otp.expiresAt < new Date()) {
    await prisma.phoneOtp.delete({ where: { id: otp.id } });
    return NextResponse.json({ error: "Kode OTP sudah kadaluarsa" }, { status: 400 });
  }

  // Simpan nomor ke profil user
  await prisma.user.update({
    where: { clerkId: userId },
    data: { phoneNumber: phone },
  });

  // Hapus OTP setelah berhasil
  await prisma.phoneOtp.deleteMany({ where: { phone } });

  return NextResponse.json({ ok: true });
}
