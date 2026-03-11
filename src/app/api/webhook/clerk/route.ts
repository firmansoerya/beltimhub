import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const payload = await req.text();
  const wh = new Webhook(webhookSecret);

  let evt: { type: string; data: Record<string, unknown> };
  try {
    evt = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as typeof evt;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { type, data } = evt;

  if (type === "user.created" || type === "user.updated") {
    const clerkId = data.id as string;
    const email = (data.email_addresses as Array<{ email_address: string }>)?.[0]?.email_address;
    const firstName = (data.first_name as string | null) ?? "";
    const lastName = (data.last_name as string | null) ?? "";
    const fullName = `${firstName} ${lastName}`.trim() || (email?.split("@")[0] ?? "User");
    const avatarUrl = data.image_url as string | undefined;

    await prisma.user.upsert({
      where: { clerkId },
      create: {
        clerkId,
        fullName,
        email,
        avatarUrl,
      },
      update: {
        fullName,
        email,
        avatarUrl,
      },
    });
  }

  if (type === "user.deleted") {
    const clerkId = data.id as string;
    await prisma.user.updateMany({
      where: { clerkId },
      data: { role: "MEMBER" },
    });
  }

  return NextResponse.json({ received: true });
}
