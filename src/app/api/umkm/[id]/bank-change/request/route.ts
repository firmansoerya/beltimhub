import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsApp } from "@/lib/whatsapp";

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
    return NextResponse.json({ error: "Nomor HP belum terdaftar di profil. Lengkapi profil terlebih dahulu." }, { status: 400 });
  }

  // Validasi nomor HP yang diinput harus cocok dengan yang terdaftar di profil
  const body = await req.json();
  const inputPhone = (body.phone ?? "").replace(/\D/g, "");
  const storedPhone = user.phoneNumber.replace(/\D/g, "");

  if (inputPhone !== storedPhone) {
    return NextResponse.json({ error: "Nomor HP tidak sesuai dengan yang terdaftar di akun Anda." }, { status: 400 });
  }

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Delete old OTPs for this phone
  await prisma.phoneOtp.deleteMany({ where: { phone: user.phoneNumber } });

  // Save OTP
  await prisma.phoneOtp.create({
    data: { phone: user.phoneNumber, code, expiresAt },
  });

  // Send via WhatsApp
  await sendWhatsApp(
    user.phoneNumber,
    `🔐 *Kode Verifikasi Perubahan Rekening*\n\nKode: *${code}*\n\nKode ini berlaku selama 10 menit.\nJika Anda tidak meminta perubahan ini, abaikan pesan ini.\n\n— BeltimHub`
  );

  return NextResponse.json({ success: true });
}
