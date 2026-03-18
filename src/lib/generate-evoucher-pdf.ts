// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require("pdfkit") as typeof import("pdfkit");

export interface EvoucherTicketRow {
  participantName: string;
  categoryName?: string | null;
  amount: number;
  platformFee: number;
  ticketCode: string;
  qrCodeDataUrl?: string | null;
  customFields?: Array<{ label: string; value: string }>;
}

export interface BrandConfig {
  brandName?: string;
  brandWebsite?: string;
  brandTagline?: string;
  supportEmail?: string;
  supportWhatsapp?: string;
}

export interface EvoucherData {
  orderId: string;
  purchaseDate: Date;
  ordererName: string;
  eventTitle: string;
  eventDate: Date;
  eventLocation: string;
  eventBannerBase64?: string | null;
  tickets: EvoucherTicketRow[];
  brand?: BrandConfig;
}

const TEAL = "#0d9488";
const TEAL_DARK = "#0f766e";
const WHITE = "#ffffff";
const DARK = "#111827";
const GRAY = "#6b7280";
const LIGHT = "#f9fafb";
const BORDER = "#e5e7eb";

function dataUrlToBuffer(dataUrl: string): Buffer | null {
  try {
    const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
    return Buffer.from(base64, "base64");
  } catch {
    return null;
  }
}

const TOS_LINES = [
  "Tunjukkan e-voucher ini beserta kartu identitas yang sesuai saat check-in di lokasi acara.",
  "Bring this e-voucher and a valid photo ID matching the participant name to the event check-in.",
  "E-Voucher ini hanya berlaku untuk satu orang dan tidak dapat dipindahtangankan.",
  "This e-voucher is non-transferable and valid for one person only.",
  "Scan QR Code menggunakan perangkat panitia saat check-in di lokasi acara.",
  "Panitia berhak menolak e-voucher yang tidak sesuai dengan data identitas pemegang.",
  "Untuk pertanyaan, hubungi kami di support@beltim.id.",
];

export function generateEvoucherPdf(data: EvoucherData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0, bufferPages: true });
    const buffers: Buffer[] = [];
    doc.on("data", (b: Buffer) => buffers.push(b));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const brand = data.brand ?? {};
    const BRAND_NAME    = brand.brandName     ?? "BELTIMHUB";
    const BRAND_WEBSITE = brand.brandWebsite  ?? "beltim.id";

    const PW = 595;
    const PH = 842;
    const ML = 36;
    const MR = 36;
    const CW = PW - ML - MR; // 523

    const eventDateStr = data.eventDate.toLocaleDateString("id-ID", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    const eventTimeStr = data.eventDate.toLocaleTimeString("id-ID", {
      hour: "2-digit", minute: "2-digit",
    }) + " WIB";
    const purchaseDateStr =
      data.purchaseDate.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) +
      " " +
      data.purchaseDate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

    const orderCode = data.orderId.replace(/-/g, "").slice(0, 8).toUpperCase();

    for (let i = 0; i < data.tickets.length; i++) {
      if (i > 0) doc.addPage();
      const t = data.tickets[i];
      const baseAmount = t.amount - t.platformFee;

      // ── Header strip ────────────────────────────────────────────────────────
      doc.rect(0, 0, PW, 58).fill(TEAL);
      // Subtle diagonal stripe texture
      doc.save();
      doc.rect(0, 0, PW, 58).clip();
      for (let sx = -60; sx < PW + 60; sx += 28) {
        doc.moveTo(sx, 0).lineTo(sx + 60, 58).lineWidth(14).strokeOpacity(0.06).stroke(WHITE);
      }
      doc.restore();
      doc.strokeOpacity(1).lineWidth(1);

      // Logo text
      doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(20).text(BRAND_NAME, ML, 16);
      doc.fillColor(WHITE).fillOpacity(0.6).font("Helvetica").fontSize(8).text(BRAND_WEBSITE, ML, 40);
      doc.fillOpacity(1);

      // "E-Voucher" right
      doc.fillColor(WHITE).font("Helvetica").fontSize(11).text("E-Voucher", 0, 22, { align: "right", width: PW - MR });

      // Ticket counter tag (pill on far right, aligned with E-Voucher text)
      const tagLabel = `${i + 1} / ${data.tickets.length}`;
      const tagW = 48;
      const tagH = 18;
      const tagX = PW - MR - tagW;
      const tagY = 37;
      doc.roundedRect(tagX, tagY, tagW, tagH, 9).fillOpacity(0.25).fill(WHITE);
      doc.fillOpacity(1);
      doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(8).text(tagLabel, tagX, tagY + 5, { width: tagW, align: "center" });

      // ── Event box ───────────────────────────────────────────────────────────
      let y = 72;
      const BOX_H   = 110;
      const IMG_W   = 160; // lebar kolom banner kiri
      const PAD     = 14;

      // Outer box — rounded corners
      const RADIUS = 8;
      doc.roundedRect(ML, y, CW, BOX_H, RADIUS).fillAndStroke(WHITE, BORDER);

      // Banner kiri — tanpa border, bg putih, fit
      doc.rect(ML, y, IMG_W, BOX_H).fill(WHITE);
      if (data.eventBannerBase64) {
        try {
          const buf = Buffer.from(data.eventBannerBase64, "base64");
          doc.image(buf, ML, y, { fit: [IMG_W, BOX_H], align: "center", valign: "center" });
        } catch { /* biarkan putih */ }
      }

      // Redraw outer rounded border on top so it overlaps banner edges cleanly
      doc.roundedRect(ML, y, CW, BOX_H, RADIUS).stroke(BORDER);

      // Info kanan — nama event, waktu, lokasi rata kiri
      const textX = ML + IMG_W + PAD;
      const textW = CW - IMG_W - PAD * 2;
      let iy = y + 14;

      doc.fillColor(DARK).font("Helvetica-Bold").fontSize(12)
        .text(data.eventTitle, textX, iy, { width: textW, lineBreak: true, ellipsis: true });
      iy = doc.y + 10;

      doc.fillColor(GRAY).font("Helvetica").fontSize(8.5)
        .text(`${eventDateStr}  ·  ${eventTimeStr}`, textX, iy, { width: textW });
      iy = doc.y + 6;

      doc.fillColor(GRAY).font("Helvetica").fontSize(8.5)
        .text(data.eventLocation, textX, iy, { width: textW, lineBreak: false, ellipsis: true });

      y += BOX_H + 14;

      // ── Section label ────────────────────────────────────────────────────────
      doc.fillColor(DARK).font("Helvetica-Bold").fontSize(11)
        .text("Informasi Pesanan", ML, y, { continued: true });
      doc.fillColor(GRAY).font("Helvetica").fontSize(9)
        .text("  /  Order Information", { continued: false });
      y += 18;

      // ── Outer info box (wraps both left fields + right QR card) ─────────────
      const CARD_W = 182;
      const CARD_X = ML + CW - CARD_W;
      const OUTER_PAD = 14;
      const cardTopY = y;
      const CARD_H = 210;

      // Outer box
      doc.roundedRect(ML, cardTopY, CW, CARD_H, RADIUS).fillAndStroke(WHITE, BORDER);

      // ── Right QR card (inside outer box) ────────────────────────────────────
      // Vertical separator
      doc.rect(CARD_X - 1, cardTopY, 1, CARD_H).fill(BORDER);

      // Category header strip
      doc.rect(CARD_X, cardTopY, CARD_W, 36).fill(TEAL_DARK);
      doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(9.5)
        .text(t.categoryName ?? "TIKET", CARD_X + 8, cardTopY + 11, { width: CARD_W - 16, align: "center" });

      // Price
      let cy = cardTopY + 46;
      doc.fillColor(TEAL).font("Helvetica-Bold").fontSize(14)
        .text(
          baseAmount === 0 ? "GRATIS" : `Rp ${baseAmount.toLocaleString("id-ID")}`,
          CARD_X, cy, { width: CARD_W, align: "center" }
        );
      cy += 22;

      // QR code
      const qrSize = 112;
      const qrX = CARD_X + (CARD_W - qrSize) / 2;
      if (t.qrCodeDataUrl) {
        const qrBuf = dataUrlToBuffer(t.qrCodeDataUrl);
        if (qrBuf) {
          try {
            doc.image(qrBuf, qrX, cy, { width: qrSize, height: qrSize });
          } catch {
            renderQrPlaceholder(doc, qrX, cy, qrSize);
          }
        } else {
          renderQrPlaceholder(doc, qrX, cy, qrSize);
        }
      } else {
        renderQrPlaceholder(doc, qrX, cy, qrSize);
      }
      cy += qrSize + 6;

      // Ticket code under QR
      doc.fillColor(GRAY).font("Helvetica").fontSize(7.5)
        .text(t.ticketCode, CARD_X, cy, { width: CARD_W, align: "center" });

      // ── Left info fields (inside outer box) ──────────────────────────────────
      const infoColW = CW - CARD_W - OUTER_PAD * 2 - 2;
      let fy = cardTopY + OUTER_PAD;

      const leftFields: [string, string, string][] = [
        ["Nama / Name", t.participantName, ""],
        ["Tanggal Pembelian / Order Date", purchaseDateStr, ""],
        ["Kode Tagihan / Invoice Code", orderCode, "mono"],
      ];

      if (t.customFields && t.customFields.length > 0) {
        for (const cf of t.customFields) {
          leftFields.push([cf.label, cf.value, ""]);
        }
      }

      for (const [label, value, style] of leftFields) {
        doc.fillColor(GRAY).font("Helvetica").fontSize(8)
          .text(label, ML + OUTER_PAD, fy, { width: infoColW });
        fy += 13;
        const font = style === "mono" ? "Courier" : "Helvetica-Bold";
        doc.fillColor(DARK).font(font).fontSize(style === "mono" ? 9 : 10)
          .text(value, ML + OUTER_PAD, fy, { width: infoColW });
        fy += 22;
      }

      y = cardTopY + CARD_H + 20;

      // ── TOS section ─────────────────────────────────────────────────────────
      doc.rect(ML, y, CW, 1).fill(BORDER);
      y += 14;

      doc.fillColor(DARK).font("Helvetica-Bold").fontSize(10)
        .text("Syarat & Ketentuan E-Voucher", ML, y, { continued: true });
      doc.fillColor(GRAY).font("Helvetica").fontSize(9)
        .text(" / Terms & Conditions", { continued: false });
      y += 18;

      for (let n = 0; n < TOS_LINES.length; n++) {
        const isEn = n % 2 === 1;
        doc.fillColor(isEn ? GRAY : DARK)
          .font("Helvetica")
          .fontSize(isEn ? 8 : 8.5)
          .text(
            isEn ? `   ${TOS_LINES[n]}` : `${Math.ceil((n + 1) / 2)}.  ${TOS_LINES[n]}`,
            ML + 4, y, { width: CW - 8 }
          );
        y += doc.currentLineHeight() + (isEn ? 6 : 2);
      }

      // ── Footer ──────────────────────────────────────────────────────────────
      doc.rect(0, PH - 38, PW, 38).fill(LIGHT);
      doc.rect(0, PH - 38, PW, 1).fill(BORDER);
      doc.fillColor(GRAY).font("Helvetica").fontSize(8)
        .text("Dokumen ini merupakan e-voucher yang sah  \u00B7  This is a valid e-voucher document", ML, PH - 26, { width: CW * 0.6 });
      doc.fillColor(TEAL).font("Helvetica-Bold").fontSize(9)
        .text(`Powered by: ${BRAND_NAME}`, 0, PH - 26, { align: "right", width: PW - MR });
    }

    doc.end();
  });
}

function renderBannerPlaceholder(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any,
  x: number, y: number, w: number, h: number,
  title: string
) {
  doc.rect(x, y, w, h).fill(TEAL);
  doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(8.5)
    .text(title, x + 6, y + h / 2 - 10, { width: w - 12, align: "center" });
}

function renderQrPlaceholder(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any,
  x: number, y: number, size: number
) {
  doc.rect(x, y, size, size).fillAndStroke(LIGHT, BORDER);
  doc.fillColor(GRAY).font("Helvetica").fontSize(8)
    .text("QR Code", x, y + size / 2 - 8, { width: size, align: "center" });
}
