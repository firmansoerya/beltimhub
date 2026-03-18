import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import path from "path";

// Register fonts sekali saat modul di-load
const FONT_DIR = path.join(process.cwd(), "public/fonts");
GlobalFonts.registerFromPath(path.join(FONT_DIR, "PlusJakartaSans-Regular.ttf"), "Plus Jakarta Sans");
GlobalFonts.registerFromPath(path.join(FONT_DIR, "PlusJakartaSans-SemiBold.ttf"), "Plus Jakarta Sans");
GlobalFonts.registerFromPath(path.join(FONT_DIR, "PlusJakartaSans-Bold.ttf"), "Plus Jakarta Sans");

const W = 400;
const SCALE = 2;
const CW = W * SCALE;
const RADIUS = 20;
const TEAL = "#0d9488";

function roundRect(
  ctx: ReturnType<typeof createCanvas>["getContext"],
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export interface TicketImageData {
  qrCodeDataUrl: string;
  ticketCode: string;
  participantName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  location: string;
  bibNumber?: string | null;
  jerseySize?: string | null;
  participantPhone?: string | null;
  participantEmail?: string | null;
}

export async function generateTicketImageBase64(data: TicketImageData): Promise<string> {
  const extraFields = [data.bibNumber, data.jerseySize, data.participantPhone, data.participantEmail].filter(Boolean).length;
  const extraRows = Math.ceil(extraFields / 2);
  const H = 560 + extraRows * 44;
  const CH = H * SCALE;

  const canvas = createCanvas(CW, CH);
  const ctx = canvas.getContext("2d");
  ctx.scale(SCALE, SCALE);

  // Shadow + clip
  ctx.shadowColor = "rgba(0,0,0,0.12)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 4;
  roundRect(ctx, 0, 0, W, H, RADIUS);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  roundRect(ctx, 0, 0, W, H, RADIUS);
  ctx.clip();

  const labelColor = "#9ca3af";
  const valueColor = "#111827";

  // Header
  ctx.fillStyle = TEAL;
  ctx.fillRect(0, 0, W, 120);

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = `600 10px 'Plus Jakarta Sans'`;
  ctx.textAlign = "center";
  ctx.fillText("BELTIMHUB · E-TICKET", W / 2, 30);

  ctx.fillStyle = "#ffffff";
  ctx.font = `700 18px 'Plus Jakarta Sans'`;
  const titleMax = W - 48;
  let title = data.eventTitle;
  while (ctx.measureText(title).width > titleMax && title.length > 0) title = title.slice(0, -1);
  if (title !== data.eventTitle) title += "…";
  ctx.fillText(title, W / 2, 62);

  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `500 12px 'Plus Jakarta Sans'`;
  ctx.fillText(`${data.eventDate}  ·  ${data.eventTime} WIB`, W / 2, 90);
  ctx.fillText(data.location, W / 2, 110);

  // QR code
  const qrImg = await loadImage(data.qrCodeDataUrl);
  const QR_SIZE = 200;
  const QR_X = (W - QR_SIZE) / 2;
  const QR_Y = 140;

  ctx.fillStyle = "#f9fafb";
  roundRect(ctx, QR_X - 12, QR_Y - 12, QR_SIZE + 24, QR_SIZE + 24, 12);
  ctx.fill();
  ctx.drawImage(qrImg, QR_X, QR_Y, QR_SIZE, QR_SIZE);

  ctx.fillStyle = labelColor;
  ctx.font = `500 11px 'Plus Jakarta Sans'`;
  ctx.fillText("Scan QR untuk verifikasi", W / 2, QR_Y + QR_SIZE + 32);

  // Dashed divider
  const DIVIDER_Y = QR_Y + QR_SIZE + 48;
  ctx.save();
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(24, DIVIDER_Y);
  ctx.lineTo(W - 24, DIVIDER_Y);
  ctx.stroke();
  ctx.restore();

  // Participant info
  let curY = DIVIDER_Y + 24;

  const fields: { label: string; value: string }[] = [
    { label: "Peserta", value: data.participantName },
  ];
  if (data.bibNumber) fields.push({ label: "Nomor BIB", value: `#${data.bibNumber}` });
  if (data.jerseySize) fields.push({ label: "Ukuran Jersey", value: data.jerseySize });
  if (data.participantPhone) fields.push({ label: "No. HP", value: data.participantPhone });
  if (data.participantEmail) fields.push({ label: "Email", value: data.participantEmail });

  const colW = W / 2;
  fields.forEach((f, i) => {
    const col = i % 2;
    const x = col === 0 ? 32 : W / 2 + 8;
    if (col === 0 && i !== 0) curY += 44;
    ctx.textAlign = "left";
    ctx.fillStyle = labelColor;
    ctx.font = `500 10px 'Plus Jakarta Sans'`;
    let val = f.value;
    const maxW = colW - 32;
    ctx.font = `600 13px 'Plus Jakarta Sans'`;
    while (ctx.measureText(val).width > maxW && val.length > 0) val = val.slice(0, -1);
    if (val !== f.value) val += "…";
    ctx.font = `500 10px 'Plus Jakarta Sans'`;
    ctx.fillText(f.label.toUpperCase(), x, curY);
    ctx.fillStyle = valueColor;
    ctx.font = `600 13px 'Plus Jakarta Sans'`;
    ctx.fillText(val, x, curY + 17);
  });

  if (fields.length % 2 !== 0 || fields.length === 0) curY += 44;
  else curY += 44;

  // Footer divider
  const FOOTER_Y = curY + 8;
  ctx.save();
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(24, FOOTER_Y);
  ctx.lineTo(W - 24, FOOTER_Y);
  ctx.stroke();
  ctx.restore();

  // Ticket code
  ctx.textAlign = "left";
  ctx.fillStyle = labelColor;
  ctx.font = `500 10px 'Plus Jakarta Sans'`;
  ctx.fillText("KODE TIKET", 24, FOOTER_Y + 18);
  ctx.fillStyle = "#374151";
  ctx.font = `700 13px 'Courier New'`;
  ctx.fillText(data.ticketCode, 24, FOOTER_Y + 36);

  ctx.textAlign = "right";
  ctx.fillStyle = TEAL;
  ctx.font = `700 13px 'Plus Jakarta Sans'`;
  ctx.fillText("beltim.id", W - 24, FOOTER_Y + 32);

  const buffer = canvas.toBuffer("image/png");
  return `data:image/png;base64,${buffer.toString("base64")}`;
}
