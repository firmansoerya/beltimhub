import { prisma } from "@/lib/prisma";

// Fee Xendit per metode (estimasi, dalam persen atau flat Rp)
// Referensi: https://www.xendit.co/id/biaya/
export const XENDIT_FEES: Record<string, { type: "percent" | "flat"; amount: number; label: string }> = {
  QRIS:        { type: "percent", amount: 0.7, label: "QRIS (Scan QR)" },
  BCA_VA:      { type: "flat", amount: 5500, label: "Transfer BCA" },
  BNI_VA:      { type: "flat", amount: 5500, label: "Transfer BNI" },
  BRI_VA:      { type: "flat", amount: 5500, label: "Transfer BRI" },
  MANDIRI_VA:  { type: "flat", amount: 5500, label: "Transfer Mandiri" },
  PERMATA_VA:  { type: "flat", amount: 5500, label: "Transfer Permata" },
  BSI_VA:      { type: "flat", amount: 5500, label: "Transfer BSI" },
  CIMB_VA:     { type: "flat", amount: 5500, label: "Transfer CIMB" },
  BJB_VA:      { type: "flat", amount: 5500, label: "Transfer BJB" },
  OVO:         { type: "percent", amount: 2.0, label: "OVO" },
  DANA:        { type: "percent", amount: 1.5, label: "DANA" },
  SHOPEEPAY:   { type: "percent", amount: 2.0, label: "ShopeePay" },
  LINKAJA:     { type: "percent", amount: 2.0, label: "LinkAja" },
};

// Default fee config
export interface MarketplaceFeeConfig {
  buyerFeePercent: number;       // Fee % yang dibebankan ke pembeli
  sellerFeePercent: number;      // Fee % yang dipotong dari pendapatan penjual
  buyerFeeMinimum: number;       // Minimum fee pembeli (Rp)
  sellerFeeMinimum: number;      // Minimum fee penjual (Rp)
  withdrawalFee: number;         // Biaya penarikan flat (Rp) per transaksi
  withdrawalMinimum: number;     // Minimum penarikan (Rp)
}

export const DEFAULT_FEE_CONFIG: MarketplaceFeeConfig = {
  buyerFeePercent: 3,
  sellerFeePercent: 2,
  buyerFeeMinimum: 1000,
  sellerFeeMinimum: 500,
  withdrawalFee: 5000,
  withdrawalMinimum: 50000,
};

const FEE_KEYS: (keyof MarketplaceFeeConfig)[] = [
  "buyerFeePercent", "sellerFeePercent",
  "buyerFeeMinimum", "sellerFeeMinimum",
  "withdrawalFee", "withdrawalMinimum",
];

// Ambil fee config dari DB (SiteSetting)
export async function getMarketplaceFeeConfig(): Promise<MarketplaceFeeConfig> {
  const dbKeys = FEE_KEYS.map(k => `marketplace_${k}`);
  const rows = await prisma.siteSetting.findMany({ where: { key: { in: dbKeys } } });
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]));

  return {
    buyerFeePercent: parseFloat(map["marketplace_buyerFeePercent"] ?? String(DEFAULT_FEE_CONFIG.buyerFeePercent)),
    sellerFeePercent: parseFloat(map["marketplace_sellerFeePercent"] ?? String(DEFAULT_FEE_CONFIG.sellerFeePercent)),
    buyerFeeMinimum: parseInt(map["marketplace_buyerFeeMinimum"] ?? String(DEFAULT_FEE_CONFIG.buyerFeeMinimum)),
    sellerFeeMinimum: parseInt(map["marketplace_sellerFeeMinimum"] ?? String(DEFAULT_FEE_CONFIG.sellerFeeMinimum)),
    withdrawalFee: parseInt(map["marketplace_withdrawalFee"] ?? String(DEFAULT_FEE_CONFIG.withdrawalFee)),
    withdrawalMinimum: parseInt(map["marketplace_withdrawalMinimum"] ?? String(DEFAULT_FEE_CONFIG.withdrawalMinimum)),
  };
}

// Hitung fee pembeli berdasarkan metode bayar
export function calculateBuyerFee(subtotal: number, paymentMethod: string, config: MarketplaceFeeConfig): number {
  const xendit = XENDIT_FEES[paymentMethod];
  const baseFee = Math.round(subtotal * config.buyerFeePercent / 100);

  // Tambahkan estimasi fee Xendit agar platform tidak rugi
  let xenditCost = 0;
  if (xendit) {
    xenditCost = xendit.type === "percent"
      ? Math.round((subtotal + baseFee) * xendit.amount / 100)
      : xendit.amount;
  }

  // Fee pembeli = max(baseFee, xenditCost, minimum)
  const totalFee = Math.max(baseFee, xenditCost, config.buyerFeeMinimum);
  return totalFee;
}

// Hitung fee penjual (dipotong dari subtotal)
export function calculateSellerFee(subtotal: number, config: MarketplaceFeeConfig): number {
  return Math.max(
    Math.round(subtotal * config.sellerFeePercent / 100),
    config.sellerFeeMinimum,
  );
}

// Hitung semua komponen harga
export function calculateOrderFees(subtotal: number, paymentMethod: string, config: MarketplaceFeeConfig) {
  const buyerFee = calculateBuyerFee(subtotal, paymentMethod, config);
  const sellerFee = calculateSellerFee(subtotal, config);
  const totalAmount = subtotal + buyerFee;        // Yang dibayar pembeli
  const sellerAmount = subtotal - sellerFee;       // Yang diterima penjual
  const platformRevenue = buyerFee + sellerFee;    // Total pendapatan platform

  return { subtotal, buyerFee, sellerFee, totalAmount, sellerAmount, platformRevenue };
}
