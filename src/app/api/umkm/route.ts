import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createUmkmSchema = z.object({
  name: z.string().min(3, "Minimal 3 karakter").max(100),
  category: z.string().min(1),
  description: z.string().min(10).max(2000),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  mapsUrl: z.string().url().optional().or(z.literal("")),
  gallery: z.array(z.string()).max(6).optional(),
  phone: z.string().optional(),
  instagram: z.string().optional(),
  website: z.string().optional(),
  imageUrl: z.string().optional(),
});

// Haversine distance in km
function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const q = searchParams.get("q");
  const nearby = searchParams.get("nearby");
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  const limit = parseInt(searchParams.get("limit") ?? "50");

  // Nearby mode: return UMKM sorted by distance
  if (nearby && !isNaN(lat) && !isNaN(lng)) {
    const items = await prisma.umkm.findMany({
      where: { latitude: { not: null }, longitude: { not: null } },
      select: {
        id: true, name: true, imageUrl: true, category: true, isVerified: true,
        latitude: true, longitude: true,
        _count: { select: { reviews: true } },
      },
    });

    const withDistance = items
      .map((u) => ({
        ...u,
        distance: haversine(lat, lng, u.latitude!, u.longitude!),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    return NextResponse.json(withDistance);
  }

  const where = {
    ...(category && category !== "Semua" ? { category } : {}),
    ...(q ? {
      OR: [
        { name: { contains: q, mode: "insensitive" as const } },
        { description: { contains: q, mode: "insensitive" as const } },
      ],
    } : {}),
  };

  const items = await prisma.umkm.findMany({
    where,
    orderBy: [{ isVerified: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: { owner: { select: { id: true, fullName: true } } },
  });

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getOrCreateUser(userId);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Batasi 1 UMKM per akun
  const existing = await prisma.umkm.findFirst({ where: { ownerId: user.id }, select: { id: true } });
  if (existing) {
    return NextResponse.json({ error: "Kamu sudah memiliki UMKM. Satu akun hanya bisa mendaftarkan 1 UMKM." }, { status: 400 });
  }

  const body = await req.json();
  const parsed = createUmkmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const umkm = await prisma.umkm.create({
    data: { ...parsed.data, ownerId: user.id },
  });

  return NextResponse.json(umkm, { status: 201 });
}
