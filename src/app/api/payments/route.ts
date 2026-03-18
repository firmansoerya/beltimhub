import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PaymentRequest } from "xendit-node";
import { z } from "zod";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const paymentSchema = z.object({
  ticketId: z.string(),
  ticketIds: z.array(z.string()).optional(), // semua tiket dalam 1 order
  paymentMethod: z.enum([
    // Virtual Account
    "BCA_VA", "BNI_VA", "BRI_VA", "MANDIRI_VA", "PERMATA_VA", "BSI_VA",
    "CIMB_VA", "BJB_VA", "SAHABAT_SAMPOERNA_VA",
    // QRIS
    "QRIS",
    // E-wallet
    "OVO", "DANA", "SHOPEEPAY", "LINKAJA",
  ]),
});

const xenditPayment = new PaymentRequest({
  secretKey: process.env.XENDIT_SECRET_KEY ?? "",
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { ticketId, ticketIds: allTicketIds, paymentMethod } = parsed.data;

  // Semua tiket dalam order (bisa 1 atau lebih)
  const orderTicketIds = allTicketIds && allTicketIds.length > 0 ? allTicketIds : [ticketId];

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { event: { select: { title: true } } },
  });

  if (!ticket) return NextResponse.json({ error: "Tiket tidak ditemukan" }, { status: 404 });
  if (ticket.paymentStatus === "PAID") return NextResponse.json({ error: "Tiket sudah dibayar" }, { status: 409 });

  // Hitung total dari semua tiket dalam order
  const allTickets = orderTicketIds.length > 1
    ? await prisma.ticket.findMany({ where: { id: { in: orderTicketIds } }, select: { amount: true } })
    : [{ amount: ticket.amount }];
  const amount = allTickets.reduce((s, t) => s + t.amount, 0);
  const description = `Tiket ${ticket.event.title} - ${ticket.participantName}`;
  const referenceId = ticket.id;

  let paymentResult: {
    type: "VA" | "QRIS" | "EWALLET";
    vaNumber?: string;
    vaBank?: string;
    qrString?: string;
    checkoutUrl?: string;
    expiryDate?: Date;
    paymentRequestId: string;
  };

  if (paymentMethod.endsWith("_VA")) {
    // Virtual Account
    const bankCode = paymentMethod.replace("_VA", "") as string;
    const result = await xenditPayment.createPaymentRequest({
      data: {
        referenceId,
        amount,
        currency: "IDR",
        paymentMethod: {
          type: "VIRTUAL_ACCOUNT",
          reusability: "ONE_TIME_USE",
          virtualAccount: {
            channelCode: bankCode as "BCA" | "BNI" | "BRI" | "MANDIRI" | "PERMATA" | "BSI" | "CIMB" | "BJB" | "SAHABAT_SAMPOERNA",
            channelProperties: {
              customerName: ticket.participantName,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 jam
            },
          },
        },
        description,
        metadata: { ticketId: ticket.id },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const va = (result as any)?.paymentMethod?.virtualAccount;
    const vaNumber = va?.channelProperties?.virtualAccountNumber ?? "";
    const expiresAt = va?.channelProperties?.expiresAt
      ? new Date(va.channelProperties.expiresAt)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    paymentResult = {
      type: "VA",
      vaNumber,
      vaBank: bankCode,
      expiryDate: expiresAt,
      paymentRequestId: result.id ?? "",
    };

    // Update primary ticket dengan midtransOrderId (unique)
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { paymentMethod, vaNumber, vaExpiry: expiresAt, midtransToken: result.id, midtransOrderId: referenceId },
    });
    // Update tiket lain dalam order tanpa midtransOrderId
    const otherIds = orderTicketIds.filter(id => id !== ticketId);
    if (otherIds.length > 0) {
      await prisma.ticket.updateMany({
        where: { id: { in: otherIds } },
        data: { paymentMethod, vaNumber, vaExpiry: expiresAt, midtransToken: result.id },
      });
    }

  } else if (paymentMethod === "QRIS") {
    if (amount > 10_000_000) {
      return NextResponse.json(
        { error: "QRIS hanya dapat digunakan untuk transaksi maksimal IDR 10.000.000. Silakan pilih metode Transfer Bank." },
        { status: 400 }
      );
    }
    const result = await xenditPayment.createPaymentRequest({
      data: {
        referenceId,
        amount,
        currency: "IDR",
        paymentMethod: {
          type: "QR_CODE",
          reusability: "ONE_TIME_USE",
          qrCode: {
            channelCode: "QRIS",
          },
        },
        description,
        metadata: { ticketId: ticket.id },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const qr = (result as any)?.paymentMethod?.qrCode;
    const qrString = qr?.channelProperties?.qrString ?? "";
    const expiryDate = new Date(Date.now() + 30 * 60 * 1000); // 30 menit

    paymentResult = {
      type: "QRIS",
      qrString,
      expiryDate,
      paymentRequestId: result.id ?? "",
    };

    await prisma.ticket.update({
      where: { id: ticketId },
      data: { paymentMethod, qrString, vaExpiry: expiryDate, midtransToken: result.id, midtransOrderId: referenceId },
    });
    const otherIdsQr = orderTicketIds.filter(id => id !== ticketId);
    if (otherIdsQr.length > 0) {
      await prisma.ticket.updateMany({
        where: { id: { in: otherIdsQr } },
        data: { paymentMethod, qrString, vaExpiry: expiryDate, midtransToken: result.id },
      });
    }

  } else {
    // E-wallet
    const channelCode = paymentMethod as "OVO" | "DANA" | "SHOPEEPAY" | "LINKAJA";
    const result = await xenditPayment.createPaymentRequest({
      data: {
        referenceId,
        amount,
        currency: "IDR",
        paymentMethod: {
          type: "EWALLET",
          reusability: "ONE_TIME_USE",
          ewallet: {
            channelCode,
            channelProperties: {
              successReturnUrl: `${APP_URL}/tiket/${ticket.id}?status=success`,
              failureReturnUrl: `${APP_URL}/event/${ticket.eventId}?status=failed`,
              cancelReturnUrl: `${APP_URL}/event/${ticket.eventId}/beli`,
            },
          },
        },
        description,
        metadata: { ticketId: ticket.id },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const checkoutUrl = (result as any)?.actions?.find((a: any) => a.action === "AUTH")?.url
      ?? (result as any)?.paymentMethod?.ewallet?.channelProperties?.successReturnUrl
      ?? null;

    paymentResult = {
      type: "EWALLET",
      checkoutUrl,
      paymentRequestId: result.id ?? "",
    };

    await prisma.ticket.update({
      where: { id: ticketId },
      data: { paymentMethod, midtransToken: result.id, midtransOrderId: referenceId },
    });
    const otherIdsEw = orderTicketIds.filter(id => id !== ticketId);
    if (otherIdsEw.length > 0) {
      await prisma.ticket.updateMany({
        where: { id: { in: otherIdsEw } },
        data: { paymentMethod, midtransToken: result.id },
      });
    }
  }

  return NextResponse.json(paymentResult, { status: 201 });
}
