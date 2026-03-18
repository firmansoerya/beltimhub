// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require("pdfkit") as typeof import("pdfkit");

export interface InvoiceTicketRow {
  participantName: string;
  categoryName?: string | null;
  amount: number;
  platformFee: number;
}

export interface BrandConfig {
  brandName?: string;
  brandWebsite?: string;
  brandTagline?: string;
  supportEmail?: string;
  supportWhatsapp?: string;
}

export interface InvoiceData {
  orderId: string;
  purchaseDate: Date;
  ordererName: string;
  ordererPhone?: string | null;
  ordererEmail?: string | null;
  eventTitle: string;
  eventDate: Date;
  eventLocation: string;
  tickets: InvoiceTicketRow[];
  paymentMethod?: string | null;
  paymentStatus: string;
  brand?: BrandConfig;
}

const TEAL   = "#0d9488";
const WHITE  = "#ffffff";
const DARK   = "#111827";
const GRAY   = "#6b7280";
const LIGHT  = "#f9fafb";
const BORDER = "#e5e7eb";
const GREEN       = "#16a34a";

function labelOf(method: string | null | undefined): string {
  const map: Record<string, string> = {
    BCA_VA:     "BCA Virtual Account",
    BNI_VA:     "BNI Virtual Account",
    BRI_VA:     "BRI Virtual Account",
    MANDIRI_VA: "Mandiri Virtual Account",
    BSI_VA:     "BSI Virtual Account",
    PERMATA_VA: "Permata Virtual Account",
    QRIS:       "QRIS",
    OVO:        "OVO",
    DANA:       "Dana",
    SHOPEEPAY:  "ShopeePay",
    LINKAJA:    "LinkAja",
  };
  return method ? (map[method] ?? method) : "—";
}

export function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0, bufferPages: true });
    const buffers: Buffer[] = [];
    doc.on("data", (b: Buffer) => buffers.push(b));
    doc.on("end",  () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    // ── Layout constants ─────────────────────────────────────────────────────
    const PW  = 595;
    const PH  = 842;
    const ML  = 44;          // left margin
    const MR  = 44;          // right margin
    const RX  = PW - MR;     // right content edge = 551
    const CW  = RX - ML;     // content width      = 507

    // Table column x-positions (absolute) ──────────────────────────────────
    // No.(28) | Produk(100) | Deskripsi(flex) | Jumlah(58) | Total(pad 10 on right)
    const C_NO    = ML;          // 44
    const C_PROD  = ML + 32;     // 76
    const C_DESC  = ML + 136;    // 180
    const C_QTY   = ML + 356;    // 400
    const C_TOT   = ML + 414;    // 458 → text right-aligned, ends at RX-10=541 ✓
    const W_NO    = 28;
    const W_PROD  = 100;
    const W_DESC  = 215;
    const W_QTY   = 56;
    const W_TOT   = RX - C_TOT - 10; // 83  (10pt padding from right border)

    const brand = data.brand ?? {};
    const BRAND_NAME     = brand.brandName     ?? "BELTIMHUB";
    const BRAND_WEBSITE  = brand.brandWebsite  ?? "beltim.id";
    const BRAND_TAGLINE  = brand.brandTagline  ?? "Hub Digital Belitung Timur";
    const SUPPORT_EMAIL  = brand.supportEmail  ?? "support@beltim.id";
    const SUPPORT_WA     = brand.supportWhatsapp ? `WhatsApp: ${brand.supportWhatsapp}` : "WhatsApp: —";

    const orderCode = data.orderId.replace(/-/g, "").slice(0, 10).toUpperCase();

    const purchaseDateStr =
      data.purchaseDate.toLocaleDateString("id-ID", {
        weekday: "short", day: "numeric", month: "short", year: "numeric",
      }) + ", " +
      data.purchaseDate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

    // ── Header (white) ───────────────────────────────────────────────────────
    doc.rect(0, 0, PW, 80).fill(WHITE);
    doc.rect(0, 79, PW, 1).fill(BORDER);

    doc.fillColor(TEAL).font("Helvetica-Bold").fontSize(22).text(BRAND_NAME, ML, 22);
    doc.fillColor(GRAY).font("Helvetica").fontSize(8).text(BRAND_WEBSITE, ML, 50);

    doc.fillColor(DARK).font("Helvetica-Bold").fontSize(14)
      .text("Bukti Pembayaran", 0, 22, { align: "right", width: RX });
    doc.fillColor(TEAL).font("Helvetica-Bold").fontSize(10)
      .text(`Order ID  #${orderCode}`, 0, 42, { align: "right", width: RX });

    let y = 100;

    // ── Info pemesan (horizontal box) ────────────────────────────────────────
    const INFO_H = 66;
    const col3W  = (CW - 28) / 3; // 3 equal columns with 14pt left pad + gap

    const R = 8;
    doc.roundedRect(ML, y, CW, INFO_H, R).fillAndStroke(LIGHT, BORDER);

    [
      { label: "Nama Pemesan",  value: data.ordererName },
      { label: "Alamat Email",  value: data.ordererEmail ?? "—" },
      { label: "Nomor Ponsel",  value: data.ordererPhone ?? "—" },
    ].forEach((col, i) => {
      const cx = ML + 14 + i * col3W;
      doc.fillColor(GRAY).font("Helvetica").fontSize(8)
        .text(col.label, cx, y + 13, { width: col3W - 14 });
      doc.fillColor(DARK).font("Helvetica-Bold").fontSize(9.5)
        .text(col.value, cx, y + 27, { width: col3W - 14 });
    });

    // Status text only (no background)
    const statusColor = data.paymentStatus === "PAID" ? GREEN : GRAY;
    const statusLabel = data.paymentStatus === "PAID" ? "LUNAS" : data.paymentStatus;
    doc.fillColor(statusColor).font("Helvetica-Bold").fontSize(13)
      .text(statusLabel, 0, y + (INFO_H / 2) - 8, { align: "right", width: RX - 16 });

    y += INFO_H + 22;

    // ── Section title ────────────────────────────────────────────────────────
    doc.fillColor(DARK).font("Helvetica-Bold").fontSize(13).text("Detail Pembayaran", ML, y);
    y += 18;

    // ── Table header ─────────────────────────────────────────────────────────
    const TH_H = 28;
    doc.rect(ML, y, CW, TH_H).fillAndStroke(LIGHT, BORDER);
    doc.fillColor(GRAY).font("Helvetica-Bold").fontSize(8.5);
    doc.text("No.",       C_NO   + 4,  y + 9, { width: W_NO });
    doc.text("Produk",    C_PROD,       y + 9, { width: W_PROD });
    doc.text("Deskripsi", C_DESC,       y + 9, { width: W_DESC });
    doc.text("Jumlah",    C_QTY,        y + 9, { width: W_QTY, align: "center" });
    doc.text("Total",     C_TOT,        y + 9, { width: W_TOT, align: "right" });
    y += TH_H;

    // ── Ticket rows ───────────────────────────────────────────────────────────
    const ROW_H = 44;
    for (let i = 0; i < data.tickets.length; i++) {
      const t = data.tickets[i];
      const baseAmount = t.amount - t.platformFee;

      doc.rect(ML, y, CW, ROW_H).fillAndStroke(WHITE, BORDER);

      // Vertical dashed separators between columns
      for (const cx of [C_DESC - 1, C_QTY - 1, C_TOT - 1]) {
        doc.moveTo(cx, y + 5).lineTo(cx, y + ROW_H - 5)
          .dash(2, { space: 3 }).stroke(BORDER);
      }
      doc.undash();

      doc.fillColor(GRAY).font("Helvetica").fontSize(8.5)
        .text(`${i + 1}`, C_NO + 4, y + 16, { width: W_NO });

      doc.fillColor(DARK).font("Helvetica").fontSize(8.5)
        .text("Tiket Event", C_PROD, y + 9, { width: W_PROD - 4 });
      doc.fillColor(GRAY).font("Helvetica").fontSize(7.5)
        .text(data.eventTitle, C_PROD, y + 23, { width: W_PROD - 4 });

      doc.fillColor(DARK).font("Helvetica-Bold").fontSize(9)
        .text(t.participantName, C_DESC + 4, y + 9, { width: W_DESC - 8 });
      if (t.categoryName) {
        doc.fillColor(GRAY).font("Helvetica").fontSize(8)
          .text(t.categoryName, C_DESC + 4, y + 24, { width: W_DESC - 8 });
      }

      doc.fillColor(DARK).font("Helvetica").fontSize(9)
        .text("1", C_QTY, y + 16, { width: W_QTY, align: "center" });

      doc.fillColor(DARK).font("Helvetica-Bold").fontSize(9)
        .text(`IDR ${baseAmount.toLocaleString("id-ID")}`, C_TOT, y + 16, { width: W_TOT, align: "right" });

      y += ROW_H;
    }

    // ── Subtotal / fee rows ───────────────────────────────────────────────────
    const totalBase  = data.tickets.reduce((s, t) => s + (t.amount - t.platformFee), 0);
    const totalFee   = data.tickets.reduce((s, t) => s + t.platformFee, 0);
    const grandTotal = totalBase + totalFee;

    // top divider
    doc.rect(ML, y, CW, 1).fill(BORDER);
    y += 12;

    // Label box ends 12pt before C_TOT so label never overlaps the value
    const lblW = C_TOT - ML - 12;

    // Subtotal
    doc.fillColor(GRAY).font("Helvetica").fontSize(9)
      .text("Subtotal", ML, y, { width: lblW, align: "right" });
    doc.fillColor(DARK).font("Helvetica").fontSize(9)
      .text(`IDR ${totalBase.toLocaleString("id-ID")}`, C_TOT, y, { width: W_TOT, align: "right" });
    y += 18;

    // Biaya platform
    doc.fillColor(GRAY).font("Helvetica").fontSize(8)
      .text("Biaya platform", ML, y, { width: lblW, align: "right" });
    doc.fillColor(DARK).font("Helvetica").fontSize(9)
      .text(`IDR ${totalFee.toLocaleString("id-ID")}`, C_TOT, y, { width: W_TOT, align: "right" });
    y += 14;

    // ── Bottom bar: method left, total right ──────────────────────────────────
    const BAR_H = 42;
    doc.roundedRect(ML, y, CW, BAR_H, R).fillAndStroke(LIGHT, BORDER);

    doc.fillColor(DARK).font("Helvetica-Bold").fontSize(9)
      .text("Waktu dan metode pembayaran", ML + 12, y + 9, { width: CW * 0.55 });
    doc.fillColor(GRAY).font("Helvetica").fontSize(8)
      .text(`${purchaseDateStr}  ·  ${labelOf(data.paymentMethod)}`, ML + 12, y + 23, { width: CW * 0.55 });

    // "Total pembayaran" label + amount — right-aligned within total column space
    doc.fillColor(GRAY).font("Helvetica").fontSize(8)
      .text("Total pembayaran", C_QTY, y + 7, { width: W_QTY + W_TOT, align: "right" });
    doc.fillColor(DARK).font("Helvetica-Bold").fontSize(13)
      .text(`IDR ${grandTotal.toLocaleString("id-ID")}`, C_QTY, y + 21, { width: W_QTY + W_TOT, align: "right" });

    y += BAR_H;

    // ── Footer ────────────────────────────────────────────────────────────────
    const footerY = PH - 70;
    doc.rect(0, footerY, PW, 70).fill(LIGHT);
    doc.rect(0, footerY, PW, 1).fill(BORDER);

    doc.fillColor(DARK).font("Helvetica-Bold").fontSize(9)
      .text(BRAND_NAME, ML, footerY + 12);
    doc.fillColor(GRAY).font("Helvetica").fontSize(8)
      .text(BRAND_TAGLINE, ML, footerY + 25);
    doc.fillColor(GRAY).font("Helvetica").fontSize(8)
      .text(SUPPORT_EMAIL, ML, footerY + 37);
    doc.fillColor(GRAY).font("Helvetica").fontSize(8)
      .text("Halaman 1 dari 1", ML, footerY + 52);

    doc.fillColor(GRAY).font("Helvetica").fontSize(8)
      .text(SUPPORT_WA, 0, footerY + 12, { align: "right", width: RX });
    doc.fillColor(GRAY).font("Helvetica").fontSize(8)
      .text(SUPPORT_EMAIL, 0, footerY + 25, { align: "right", width: RX });
    doc.fillColor(TEAL).font("Helvetica-Bold").fontSize(10)
      .text(BRAND_NAME, 0, footerY + 48, { align: "right", width: RX });

    void y;
    doc.end();
  });
}
