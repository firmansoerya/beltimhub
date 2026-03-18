import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { VerificationForm } from "./VerificationForm";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Clock, XCircle } from "lucide-react";

export default async function VerifikasiPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: {
      id: true,
      fullName: true,
      isVerified: true,
      verifiedAt: true,
      verificationRequest: true,
    },
  });
  if (!user) redirect("/sign-in");

  // Sudah terverifikasi
  if (user.isVerified) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-3">
        <VerifiedBadge size="md" className="h-12 w-12 mx-auto" />
        <h1 className="text-xl font-bold">Akun Anda Sudah Terverifikasi</h1>
        <p className="text-sm text-muted-foreground">
          Verified sejak{" "}
          {user.verifiedAt
            ? new Date(user.verifiedAt).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : "—"}
        </p>
      </div>
    );
  }

  const request = user.verificationRequest;

  // Permohonan sedang diproses
  if (request?.status === "PENDING") {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-3">
        <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center mx-auto">
          <Clock className="h-6 w-6 text-yellow-600" />
        </div>
        <h1 className="text-xl font-bold">Permohonan Sedang Diproses</h1>
        <p className="text-sm text-muted-foreground">
          Pengajuan Anda diterima pada{" "}
          {new Date(request.createdAt).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          . Admin akan memverifikasi dalam 1–2 hari kerja.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="sticky top-0 z-20 bg-background -mx-6 md:-mx-8 px-6 md:px-8 py-5 border-b mb-8">
        <h1 className="text-xl font-bold mb-0.5">Ajukan Verifikasi Akun</h1>
        <p className="text-sm text-muted-foreground">
          Verifikasi identitas Anda untuk mendapatkan badge centang biru di setiap konten yang Anda posting.
        </p>
      </div>
      <div className="max-w-xl mx-auto">

      {/* Rejected state */}
      {request?.status === "REJECTED" && (
        <div className="mb-5 flex gap-3 p-4 rounded-xl border border-red-200 bg-red-50">
          <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm text-red-700">Permohonan Sebelumnya Ditolak</p>
            {request.adminNotes && (
              <p className="text-sm text-red-600 mt-0.5">{request.adminNotes}</p>
            )}
            <p className="text-xs text-red-500 mt-1">Silakan ajukan ulang dengan dokumen yang benar.</p>
          </div>
        </div>
      )}

      {/* Cara verifikasi */}
      <div className="bg-muted/50 rounded-xl p-4 mb-6 space-y-2 text-sm">
        <p className="font-medium">Dokumen yang dibutuhkan:</p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li><strong>Foto KTP</strong> — pastikan semua tulisan terbaca jelas</li>
          <li><strong>Foto selfie sambil pegang KTP</strong> — wajah dan KTP harus terlihat jelas</li>
        </ul>
        <p className="text-muted-foreground text-xs mt-2">Format: JPG/PNG, maks. 5MB per file</p>
      </div>

      <VerificationForm />
      </div>
    </div>
  );
}
