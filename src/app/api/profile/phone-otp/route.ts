import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsApp } from "@/lib/whatsapp";

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function normalizePhone(raw: string): string {
  let phone = raw.trim().replace(/\D/g, "");
  if (phone.startsWith("0")) phone = "62" + phone.slice(1);
  if (!phone.startsWith("62")) phone = "62" + phone;
  return phone;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const phone: string = body.phone;
  if (!phone || phone.trim().length < 8) {
    return NextResponse.json({ error: "Nomor HP tidak valid" }, { status: 400 });
  }

  const normalized = normalizePhone(phone);

  // Cek apakah nomor sudah dipakai user lain
  const existing = await prisma.user.findUnique({ where: { phoneNumber: normalized } });
  const currentUser = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (existing && existing.id !== currentUser?.id) {
    return NextResponse.json({ error: "Nomor ini sudah digunakan akun lain" }, { status: 409 });
  }

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 menit

  // Hapus OTP lama untuk nomor ini
  await prisma.phoneOtp.deleteMany({ where: { phone: normalized } });

  await prisma.phoneOtp.create({
    data: { phone: normalized, code, expiresAt },
  });

  const message = `Kode verifikasi WhatsApp BeltimHub Anda:\n\n*${code}*\n\nKode berlaku 5 menit. Jangan bagikan kode ini kepada siapapun.`;

  try {
    await sendWhatsApp(normalized, message);
  } catch (err) {
    console.error("Failed to send OTP:", err);
    return NextResponse.json({ error: "Gagal mengirim OTP, coba lagi" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, phone: normalized });
}
