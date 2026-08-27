import { NextResponse } from "next/server";
import { getMarketplaceFeeConfig, XENDIT_FEES } from "@/lib/marketplace-fees";

// GET — public endpoint, fee config untuk frontend
export async function GET() {
  const config = await getMarketplaceFeeConfig();

  // Return config + payment methods dengan label
  const paymentMethods = Object.entries(XENDIT_FEES).map(([value, info]) => ({
    value,
    label: info.label,
  }));

  return NextResponse.json({ config, paymentMethods });
}
