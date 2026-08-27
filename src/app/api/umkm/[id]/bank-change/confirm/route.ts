import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const confirmSchema = z.object({
  code: z.string().length(6),
  bankName: z.string().min(1),
  bankAccountNumber: z.string().min(1),
  bankAccountName: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id } = await params;
  const umkm = await prisma.umkm.findUnique({ where: { id }, select: { ownerId: true } });
  if (!umkm) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (umkm.ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!user.phoneNumber) {
    return NextResponse.json({ error: "Nomor HP belum terdaftar" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  // Verify OTP
  const otp = await prisma.phoneOtp.findFirst({
    where: { phone: user.phoneNumber, code: parsed.data.code },
  });

  if (!otp) {
    return NextResponse.json({ error: "Kode verifikasi salah" }, { status: 400 });
  }

  if (otp.expiresAt < new Date()) {
    await prisma.phoneOtp.delete({ where: { id: otp.id } });
    return NextResponse.json({ error: "Kode verifikasi sudah kedaluwarsa" }, { status: 400 });
  }

  // Update bank info and delete OTP
  await Promise.all([
    prisma.umkm.update({
      where: { id },
      data: {
        bankName: parsed.data.bankName,
        bankAccountNumber: parsed.data.bankAccountNumber,
        bankAccountName: parsed.data.bankAccountName,
      },
    }),
    prisma.phoneOtp.delete({ where: { id: otp.id } }),
  ]);

  return NextResponse.json({ success: true });
}
