import { generateInvoicePdf } from "../src/lib/generate-invoice-pdf";
import { generateEvoucherPdf } from "../src/lib/generate-evoucher-pdf";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

async function main() {
  const outDir = path.join(process.cwd(), "scripts/pdf-preview");
  fs.mkdirSync(outDir, { recursive: true });

  const orderId = randomUUID();
  const purchaseDate = new Date("2026-03-18T10:30:00");
  const eventDate = new Date("2026-05-02T07:00:00");

  const participantNames = ["Firman Surya", "Siti Aminah", "Budi Santoso"];
  const categories = ["10K", "5K", "10K"];
  const amounts = [157500, 105000, 157500];
  const fees = [7500, 5000, 7500];

  const qrCodeDataUrls = await Promise.all(
    participantNames.map((name, i) =>
      QRCode.toDataURL(
        JSON.stringify({ ticketId: `preview-${i}`, ticketCode: `PREVIEW${i + 1}`, name }),
        { errorCorrectionLevel: "H", width: 400, margin: 2 }
      )
    )
  );

  const tickets = participantNames.map((name, i) => ({
    participantName: name,
    categoryName: categories[i],
    amount: amounts[i],
    platformFee: fees[i],
    ticketCode: `PREV-${orderId.slice(0, 6).toUpperCase()}-00${i + 1}`,
    qrCodeDataUrl: qrCodeDataUrls[i],
  }));

  const invoicePdf = await generateInvoicePdf({
    orderId,
    purchaseDate,
    ordererName: "Firman Surya",
    ordererPhone: "081234567890",
    ordererEmail: "firman@example.com",
    eventTitle: "Mudong Beach Run 2026",
    eventDate,
    eventLocation: "Mudong Beach Park, Manggar",
    tickets,
    paymentMethod: "BCA_VA",
    paymentStatus: "PAID",
  });

  fs.writeFileSync(path.join(outDir, "invoice-preview.pdf"), invoicePdf);
  console.log("invoice-preview.pdf generated");

  const evoucherPdf = await generateEvoucherPdf({
    orderId,
    purchaseDate,
    ordererName: "Firman Surya",
    eventTitle: "Mudong Beach Run 2026",
    eventDate,
    eventLocation: "Mudong Beach Park, Manggar",
    tickets,
  });

  fs.writeFileSync(path.join(outDir, "evoucher-preview.pdf"), evoucherPdf);
  console.log("evoucher-preview.pdf generated");

  console.log(`\nFiles saved to: ${outDir}`);
  console.log(`Order ID      : ${orderId}`);
  console.log(`Order Code    : ${orderId.replace(/-/g, "").slice(0, 8).toUpperCase()}`);
}

main().catch(console.error);
