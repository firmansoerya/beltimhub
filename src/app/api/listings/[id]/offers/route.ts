import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

const createOfferSchema = z.object({
  buyerName: z.string().min(2, "Nama minimal 2 karakter").max(100),
  buyerPhone: z.string().min(8, "Nomor HP tidak valid").max(20),
  offeredPrice: z.coerce.number().int().min(1, "Harga penawaran harus lebih dari 0"),
  message: z.string().max(500).optional(),
});

// POST /api/listings/[id]/offers — buat penawaran (publik, tanpa auth)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const listing = await prisma.listing.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!listing || listing.status === "DELETED") {
    return NextResponse.json({ error: "Iklan tidak ditemukan" }, { status: 404 });
  }
  if (listing.status !== "ACTIVE") {
    return NextResponse.json({ error: "Iklan sudah tidak aktif" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = createOfferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const offer = await prisma.priceOffer.create({
    data: {
      listingId: id,
      buyerName: parsed.data.buyerName,
      buyerPhone: parsed.data.buyerPhone,
      offeredPrice: parsed.data.offeredPrice,
      message: parsed.data.message,
    },
  });

  return NextResponse.json(offer, { status: 201 });
}

// GET /api/listings/[id]/offers — list penawaran (hanya pemilik iklan)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [listing, currentUser] = await Promise.all([
    prisma.listing.findUnique({ where: { id }, select: { id: true, sellerId: true } }),
    prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true, role: true } }),
  ]);

  if (!listing) return NextResponse.json({ error: "Iklan tidak ditemukan" }, { status: 404 });
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (listing.sellerId !== currentUser.id && currentUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const offers = await prisma.priceOffer.findMany({
    where: { listingId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(offers);
}

// PATCH /api/listings/[id]/offers?offerId=xxx — update status penawaran
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const offerId = req.nextUrl.searchParams.get("offerId");
  if (!offerId) return NextResponse.json({ error: "offerId required" }, { status: 400 });

  const [listing, currentUser] = await Promise.all([
    prisma.listing.findUnique({ where: { id }, select: { sellerId: true } }),
    prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true, role: true } }),
  ]);

  if (!listing || !currentUser) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (listing.sellerId !== currentUser.id && currentUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { status } = await req.json();
  if (!["PENDING", "CONTACTED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
  }

  const updated = await prisma.priceOffer.update({
    where: { id: offerId },
    data: { status },
  });

  return NextResponse.json(updated);
}
