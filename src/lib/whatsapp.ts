export async function sendWhatsApp(
  phone: string,
  message: string
): Promise<void> {
  const apiKey = process.env.FONNTE_API_KEY;
  if (!apiKey) {
    console.warn("[WhatsApp] FONNTE_API_KEY not set, skipping notification");
    return;
  }

  // Normalize phone number (remove leading 0, add country code)
  const normalized = phone.replace(/\D/g, "").replace(/^0/, "62");

  const res = await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      target: normalized,
      message,
      countryCode: "62",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WhatsApp send failed: ${err}`);
  }
}
