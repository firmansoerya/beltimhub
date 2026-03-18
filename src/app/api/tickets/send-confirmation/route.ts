import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  ticketIds: z.array(z.string()).min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { ticketIds } = parsed.data;

  const { sendOrderConfirmationForTickets } = await import("@/lib/ticket-service");
  try {
    await sendOrderConfirmationForTickets(ticketIds);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
