import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { uploadAvatar } from "@/lib/supabase-storage";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_AVATAR = 2 * 1024 * 1024;   // 2MB
const MAX_SIZE_BANNER = 5 * 1024 * 1024;   // 5MB

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const type = formData.get("type") as string | null;

  if (!file || !type) return NextResponse.json({ error: "File dan type wajib ada" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: "Format file tidak didukung (jpg/png/webp)" }, { status: 400 });

  const maxSize = type === "banner" ? MAX_SIZE_BANNER : MAX_SIZE_AVATAR;
  if (file.size > maxSize) {
    return NextResponse.json({ error: `Ukuran file terlalu besar (maks. ${maxSize / 1024 / 1024}MB)` }, { status: 400 });
  }

  if (!["avatar", "logo", "banner", "content"].includes(type)) {
    return NextResponse.json({ error: "Type tidak valid" }, { status: 400 });
  }

  const url = await uploadAvatar(file, user.id, type as "avatar" | "logo" | "banner" | "content");

  // Langsung update DB sesuai type
  if (type === "avatar") {
    await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: url } });
  } else if (type === "logo") {
    await prisma.user.update({ where: { id: user.id }, data: { organizerLogoUrl: url } });
  } else if (type === "banner") {
    await prisma.user.update({ where: { id: user.id }, data: { organizerBannerUrl: url } });
  }
  // "content" type: hanya upload, tidak update DB

  return NextResponse.json({ url });
}
