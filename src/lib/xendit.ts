import Xendit from "xendit-node";

const xenditClient = new Xendit({
  secretKey: process.env.XENDIT_SECRET_KEY ?? "",
});

export const { Invoice, PaymentRequest } = xenditClient;

export async function createInvoice({
  externalId,
  amount,
  payerEmail,
  description,
  successRedirectUrl,
  failureRedirectUrl,
}: {
  externalId: string;
  amount: number;
  payerEmail?: string;
  description: string;
  successRedirectUrl: string;
  failureRedirectUrl: string;
}) {
  const invoice = await Invoice.createInvoice({
    data: {
      externalId,
      amount,
      payerEmail,
      description,
      successRedirectUrl,
      failureRedirectUrl,
      currency: "IDR",
      invoiceDuration: 86400, // 24 hours
      reminderTime: 1,
      items: [
        {
          name: description,
          quantity: 1,
          price: amount,
          category: "TICKET",
        },
      ],
    },
  });

  return invoice;
}

export function verifyXenditWebhook(
  callbackToken: string,
  expectedToken: string
): boolean {
  return callbackToken === expectedToken;
}
