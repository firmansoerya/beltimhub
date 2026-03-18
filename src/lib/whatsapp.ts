function getGatewayHeaders(): Record<string, string> | null {
  const gatewayUrl = process.env.WA_GATEWAY_URL;
  if (!gatewayUrl) {
    console.warn("[WhatsApp] WA_GATEWAY_URL not set, skipping notification");
    return null;
  }
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.WA_GATEWAY_API_KEY) {
    headers["x-api-key"] = process.env.WA_GATEWAY_API_KEY;
  }
  return headers;
}

export async function sendWhatsApp(
  phone: string,
  message: string
): Promise<void> {
  const headers = getGatewayHeaders();
  if (!headers) return;

  const res = await fetch(`${process.env.WA_GATEWAY_URL}/send`, {
    method: "POST",
    headers,
    body: JSON.stringify({ phone, message }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WhatsApp send failed: ${err}`);
  }
}

export async function sendWhatsAppImage(
  phone: string,
  image: string,
  caption?: string
): Promise<void> {
  const headers = getGatewayHeaders();
  if (!headers) return;

  const res = await fetch(`${process.env.WA_GATEWAY_URL}/send`, {
    method: "POST",
    headers,
    body: JSON.stringify({ phone, image, message: caption }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WhatsApp send image failed: ${err}`);
  }
}

export async function sendWhatsAppDocument(
  phone: string,
  base64: string,
  filename: string,
  caption?: string,
  mimetype = "application/pdf"
): Promise<void> {
  const headers = getGatewayHeaders();
  if (!headers) return;

  const res = await fetch(`${process.env.WA_GATEWAY_URL}/send-document`, {
    method: "POST",
    headers,
    body: JSON.stringify({ phone, base64, filename, mimetype, caption }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WhatsApp send document failed: ${err}`);
  }
}
