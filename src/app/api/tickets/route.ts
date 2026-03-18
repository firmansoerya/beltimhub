import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";

const registerSchema = z.object({
  eventId: z.string(),
  ticketCategoryId: z.string().optional(),
  orderId: z.string().optional(),
  participantName: z.string().min(2),
  participantPhone: z.string().optional(),
  participantEmail: z
    .string()
    .email()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v)),
  participantKtp: z.string().optional(),
  ordererPhone: z.string().optional(),
  ordererEmail: z.string().email().optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  jerseySize: z.string().optional(),
  customData: z.record(z.string(), z.unknown()).optional(),
});

const PLATFORM_FEE_PERCENT = parseInt(process.env.PLATFORM_FEE_PERCENT ?? "5");

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();

  let userId: string | undefined = undefined;
  if (clerkId) {
    let user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      const clerkUser = await currentUser();
      if (clerkUser) {
        const fullName = clerkUser.fullName || `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || "User";
        user = await prisma.user.create({
          data: {
            clerkId,
            fullName,
            email: clerkUser.emailAddresses[0]?.emailAddress ?? undefined,
            avatarUrl: clerkUser.imageUrl,
          },
        });
      }
    }
    if (user) userId = user.id;
  }

  const body = await req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { eventId, ticketCategoryId, orderId, ...participantData } = parsed.data;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const event = await (prisma.event.findUnique as any)({
    where: { id: eventId },
    select: {
      id: true, price: true, quota: true, status: true, feeType: true,
      oneEmailOneTransaction: true, uniqueParticipants: true,
    },
  });
  if (!event || event.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Event not found or not available" }, { status: 404 });
  }

  // ── Validasi 1 email 1 transaksi ────────────────────────────────────────────
  if (event.oneEmailOneTransaction && participantData.participantEmail) {
    const existingEmail = await prisma.ticket.findFirst({
      where: {
        eventId,
        participantEmail: participantData.participantEmail,
        paymentStatus: { in: ["PAID", "PENDING"] },
      },
    });
    if (existingEmail) {
      return NextResponse.json(
        { error: "Email ini sudah digunakan untuk mendaftar event ini" },
        { status: 409 }
      );
    }
  }

  // ── Validasi KTP unik (uniqueParticipants) ──────────────────────────────────
  if (event.uniqueParticipants) {
    if (!participantData.participantKtp?.trim()) {
      return NextResponse.json(
        { error: "Nomor KTP wajib diisi untuk event ini" },
        { status: 400 }
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingKtp = await (prisma.ticket.findFirst as any)({
      where: {
        eventId,
        participantKtp: participantData.participantKtp.trim(),
        paymentStatus: "PAID",
      },
    });
    if (existingKtp) {
      return NextResponse.json(
        { error: "Nomor KTP ini sudah terdaftar di event ini" },
        { status: 409 }
      );
    }
  }

  // ── Validasi kuota ──────────────────────────────────────────────────────────
  let categoryPrice = event.price;
  let categoryQuota = event.quota;

  if (ticketCategoryId) {
    const category = await prisma.ticketCategory.findUnique({ where: { id: ticketCategoryId } });
    if (!category || category.eventId !== eventId) {
      return NextResponse.json({ error: "Kategori tiket tidak valid" }, { status: 400 });
    }
    categoryPrice = category.price;
    categoryQuota = category.quota;

    const catSoldCount = await prisma.ticket.count({
      where: { eventId, ticketCategoryId, paymentStatus: "PAID" },
    });
    if (catSoldCount >= categoryQuota) {
      return NextResponse.json({ error: "Kuota kategori ini sudah habis" }, { status: 409 });
    }

    const maxPerPerson = (category as unknown as { maxPerPerson?: number | null }).maxPerPerson ?? 10;
    if (userId && maxPerPerson > 0) {
      const userCatCount = await prisma.ticket.count({
        where: { eventId, ticketCategoryId, userId, paymentStatus: { in: ["PAID", "PENDING"] } },
      });
      if (userCatCount >= maxPerPerson) {
        return NextResponse.json(
          { error: `Maksimal ${maxPerPerson} tiket per orang untuk kategori ini` },
          { status: 409 }
        );
      }
    }
  } else {
    const soldCount = await prisma.ticket.count({ where: { eventId, paymentStatus: "PAID" } });
    if (soldCount >= event.quota) {
      return NextResponse.json({ error: "Event sudah penuh" }, { status: 409 });
    }
  }

  // ── Cek duplikasi ───────────────────────────────────────────────────────────
  // Skip duplicate check for multi-ticket orders (orderId provided)
  const dupWhere = orderId ? null : userId
    ? { eventId, userId }
    : participantData.participantPhone
      ? { eventId, participantPhone: participantData.participantPhone }
      : null;

  if (dupWhere) {
    const existing = await prisma.ticket.findFirst({
      where: {
        ...dupWhere,
        paymentStatus: { not: "FAILED" },
        ...(ticketCategoryId ? { ticketCategoryId } : {}),
      },
    });

    if (existing) {
      if (existing.paymentStatus === "PAID") {
        return NextResponse.json(
          { error: userId ? "Anda sudah terdaftar di event ini" : "Nomor HP ini sudah terdaftar di event ini" },
          { status: 409 }
        );
      }
      if (categoryPrice === 0) {
        return NextResponse.json({ error: "Anda sudah terdaftar di event ini" }, { status: 409 });
      }
      return NextResponse.json(
        { ticket: existing, requiresPayment: true, isFree: false },
        { status: 200 }
      );
    }
  }

  const platformFee = Math.round(categoryPrice * (PLATFORM_FEE_PERCENT / 100));
  const totalAmount = event.feeType === "FEE_ABSORBED" ? categoryPrice : categoryPrice + platformFee;

  const ticketId = randomUUID();
  const ticketCode = randomUUID().replace(/-/g, "").substring(0, 16).toUpperCase();
  const now = new Date();

  const legacyJersey = participantData.customData?.["__legacy_jersey"];
  const jerseySize = participantData.jerseySize
    ?? (typeof legacyJersey === "string" ? legacyJersey : null)
    ?? null;

  const customDataJson = participantData.customData
    ? JSON.stringify(participantData.customData)
    : null;

  const ktpValue = participantData.participantKtp?.trim() ?? null;
  const ordererPhone = participantData.ordererPhone?.trim() ?? null;
  const ordererEmail = participantData.ordererEmail?.trim() ?? null;

  await prisma.$executeRaw`
    INSERT INTO tickets (id, "eventId", "userId", "ticketCode", "ticketCategoryId", "orderId", "participantName", "participantPhone", "participantEmail", "participantKtp", "ordererPhone", "ordererEmail", "jerseySize", "customData", amount, "platformFee", "paymentStatus", "createdAt", "updatedAt")
    VALUES (
      ${ticketId},
      ${eventId},
      ${userId ?? null},
      ${ticketCode},
      ${ticketCategoryId ?? null},
      ${orderId ?? null},
      ${participantData.participantName},
      ${participantData.participantPhone ?? null},
      ${participantData.participantEmail ?? null},
      ${ktpValue},
      ${ordererPhone},
      ${ordererEmail},
      ${jerseySize},
      ${customDataJson}::jsonb,
      ${totalAmount},
      ${platformFee},
      'PENDING',
      ${now},
      ${now}
    )
  `;

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new Error("Gagal membuat tiket");

  if (categoryPrice === 0) {
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { paymentStatus: "PAID", paidAt: new Date() },
    });
    await prisma.event.update({
      where: { id: eventId },
      data: { registeredCount: { increment: 1 } },
    });
    const { generateAndSendTicket } = await import("@/lib/ticket-service");
    generateAndSendTicket(ticket.id).catch(console.error);
    return NextResponse.json({ ticket, requiresPayment: false, isFree: true }, { status: 201 });
  }

  return NextResponse.json({ ticket, requiresPayment: true, isFree: false }, { status: 201 });
}
