import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createInvoice } from "@/lib/xendit";
import { z } from "zod";
import { randomUUID } from "crypto";

const registerSchema = z.object({
  eventId: z.string(),
  participantName: z.string().min(2),
  participantPhone: z.string().optional(),
  participantEmail: z
    .string()
    .email()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v)),
  jerseySize: z.string().optional(),
  customData: z.record(z.string(), z.unknown()).optional(),
});

const PLATFORM_FEE_PERCENT = parseInt(process.env.PLATFORM_FEE_PERCENT ?? "5");
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();

  // Opsional: link tiket ke akun jika user sudah login
  let userId: string | undefined = undefined;
  if (clerkId) {
    let user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      const clerkUser = await currentUser();
      if (clerkUser) {
        const firstName = clerkUser.firstName ?? "";
        const lastName = clerkUser.lastName ?? "";
        const fullName = clerkUser.fullName || `${firstName} ${lastName}`.trim() || "User";
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

  const { eventId, ...participantData } = parsed.data;

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || event.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Event not found or not available" }, { status: 404 });
  }

  const soldCount = await prisma.ticket.count({
    where: { eventId, paymentStatus: "PAID" },
  });

  if (soldCount >= event.quota) {
    return NextResponse.json({ error: "Event sudah penuh" }, { status: 409 });
  }

  // Cek duplikasi: jika PAID → blokir; jika PENDING pada event berbayar → kembalikan link lama
  const dupWhere = userId
    ? { eventId, userId }
    : participantData.participantPhone
      ? { eventId, participantPhone: participantData.participantPhone }
      : null;

  if (dupWhere) {
    const existing = await prisma.ticket.findFirst({
      where: { ...dupWhere, paymentStatus: { not: "FAILED" } },
    });

    if (existing) {
      if (existing.paymentStatus === "PAID") {
        return NextResponse.json(
          { error: userId ? "Anda sudah terdaftar di event ini" : "Nomor HP ini sudah terdaftar di event ini" },
          { status: 409 }
        );
      }
      // PENDING → event gratis harusnya tidak terjadi, tapi jaga-jaga
      if (event.price === 0) {
        return NextResponse.json({ error: "Anda sudah terdaftar di event ini" }, { status: 409 });
      }
      // PENDING pada event berbayar → kembalikan link pembayaran yang sudah ada
      if (existing.midtransToken) {
        const { Invoice } = await import("@/lib/xendit").then((m) => m);
        const invoice = await Invoice.getInvoiceById({ invoiceId: existing.midtransToken });
        return NextResponse.json(
          { ticket: existing, paymentUrl: (invoice as { invoiceUrl?: string }).invoiceUrl ?? null, isFree: false },
          { status: 200 }
        );
      }
      // Tidak ada invoice → hapus tiket lama yang stuck agar bisa buat baru
      await prisma.ticket.delete({ where: { id: existing.id } });
    }
  }

  const platformFee = Math.round(event.price * (PLATFORM_FEE_PERCENT / 100));
  const totalAmount = event.price + platformFee;

  const ticketId = randomUUID();
  const ticketCode = randomUUID().replace(/-/g, "").substring(0, 16).toUpperCase();
  const now = new Date();

  const customDataJson = participantData.customData
    ? JSON.stringify(participantData.customData)
    : null;

  await prisma.$executeRaw`
    INSERT INTO tickets (id, "eventId", "userId", "ticketCode", "participantName", "participantPhone", "participantEmail", "jerseySize", "customData", amount, "platformFee", "paymentStatus", "createdAt", "updatedAt")
    VALUES (
      ${ticketId},
      ${eventId},
      ${userId ?? null},
      ${ticketCode},
      ${participantData.participantName},
      ${participantData.participantPhone ?? null},
      ${participantData.participantEmail ?? null},
      ${participantData.jerseySize ?? null},
      ${customDataJson}::jsonb,
      ${event.price},
      ${platformFee},
      'PENDING',
      ${now},
      ${now}
    )
  `;

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new Error("Gagal membuat tiket");

  // For free events, mark as paid immediately
  if (event.price === 0) {
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { paymentStatus: "PAID", paidAt: new Date() },
    });
    await prisma.event.update({
      where: { id: eventId },
      data: { registeredCount: { increment: 1 } },
    });
    return NextResponse.json({ ticket, paymentUrl: null, isFree: true }, { status: 201 });
  }

  // Create Xendit invoice
  const invoice = await createInvoice({
    externalId: ticket.id,
    amount: totalAmount,
    payerEmail: participantData.participantEmail,
    description: `Tiket ${event.title} - ${participantData.participantName}`,
    successRedirectUrl: `${APP_URL}/tiket/${ticket.id}?status=success`,
    failureRedirectUrl: `${APP_URL}/event/${eventId}?status=failed`,
  });

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      midtransToken: invoice.id,
      midtransOrderId: invoice.externalId,
    },
  });

  return NextResponse.json(
    { ticket, paymentUrl: invoice.invoiceUrl, isFree: false },
    { status: 201 }
  );
}
