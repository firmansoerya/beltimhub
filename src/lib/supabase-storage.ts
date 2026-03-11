import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Gunakan service role key untuk upload server-side (bypass RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export const VERIFICATION_BUCKET = "verification-docs";

export async function uploadVerificationFile(
  file: File,
  userId: string,
  type: "ktp" | "selfie"
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${type}-${Date.now()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error } = await supabaseAdmin.storage
    .from(VERIFICATION_BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (error) throw new Error(error.message);

  // Simpan path saja, bukan public URL (bucket bersifat private)
  return path;
}

// Buat signed URL sementara (berlaku 1 jam) — hanya untuk admin
export async function getSignedUrl(path: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(VERIFICATION_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error || !data) throw new Error(error?.message ?? "Failed to create signed URL");
  return data.signedUrl;
}
