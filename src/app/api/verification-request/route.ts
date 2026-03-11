import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { prisma } from "@/lib/prisma";
import { uploadVerificationFile } from "@/lib/supabase-storage";

// GET: status pengajuan user saat ini
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, isVerified: true, verificationRequest: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    isVerified: user.isVerified,
    request: user.verificationRequest,
  });
}

// POST: ajukan permohonan verifikasi (multipart/form-data)
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getOrCreateUser(userId);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (user.isVerified) {
    return NextResponse.json({ error: "Akun sudah terverifikasi" }, { status: 400 });
  }

  // Cek apakah sudah ada permohonan pending/approved
  const existing = await prisma.verificationRequest.findUnique({
    where: { userId: user.id },
  });
  if (existing && existing.status === "PENDING") {
    return NextResponse.json({ error: "Permohonan verifikasi sedang diproses" }, { status: 400 });
  }

  const formData = await req.formData();
  const ktpFile = formData.get("ktp") as File | null;
  const selfieFile = formData.get("selfie") as File | null;

  if (!ktpFile || !selfieFile) {
    return NextResponse.json({ error: "File KTP dan selfie wajib diisi" }, { status: 400 });
  }

  // Validasi ukuran file (max 5MB)
  if (ktpFile.size > 5 * 1024 * 1024 || selfieFile.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Ukuran file maksimal 5MB" }, { status: 400 });
  }

  const [ktpUrl, selfieUrl] = await Promise.all([
    uploadVerificationFile(ktpFile, user.id, "ktp"),
    uploadVerificationFile(selfieFile, user.id, "selfie"),
  ]);

  // Upsert: jika sudah pernah ditolak, bisa ajukan ulang
  const request = await prisma.verificationRequest.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ktpUrl, selfieUrl },
    update: {
      ktpUrl,
      selfieUrl,
      status: "PENDING",
      adminNotes: null,
      reviewedAt: null,
    },
  });

  return NextResponse.json(request, { status: 201 });
}
