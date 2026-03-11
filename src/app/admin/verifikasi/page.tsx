import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSignedUrl } from "@/lib/supabase-storage";
import { ReviewRequestButtons } from "./ReviewRequestButtons";
import { Clock, CheckCircle2, XCircle } from "lucide-react";

const STATUS_TABS = ["PENDING", "APPROVED", "REJECTED"] as const;
type Tab = (typeof STATUS_TABS)[number];

export default async function AdminVerifikasiPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!dbUser || (dbUser.role !== "ADMIN" && dbUser.role !== "MODERATOR")) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const tab: Tab =
    STATUS_TABS.includes(params.tab as Tab) ? (params.tab as Tab) : "PENDING";

  const requests = await prisma.verificationRequest.findMany({
    where: { status: tab },
    orderBy: { updatedAt: "desc" },
    include: { user: { select: { fullName: true, email: true } } },
  });

  // Generate signed URLs hanya untuk PENDING (perlu ditampilkan)
  const requestsWithUrls =
    tab === "PENDING"
      ? await Promise.all(
          requests.map(async (req) => ({
            ...req,
            ktpSignedUrl: await getSignedUrl(req.ktpUrl),
            selfieSignedUrl: await getSignedUrl(req.selfieUrl),
          }))
        )
      : requests.map((req) => ({
          ...req,
          ktpSignedUrl: null,
          selfieSignedUrl: null,
        }));

  const tabConfig = {
    PENDING: { label: "Menunggu", icon: Clock, color: "text-yellow-600" },
    APPROVED: { label: "Disetujui", icon: CheckCircle2, color: "text-green-600" },
    REJECTED: { label: "Ditolak", icon: XCircle, color: "text-red-500" },
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Verifikasi User</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review permohonan verifikasi identitas pengguna
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b mb-6">
        {STATUS_TABS.map((t) => {
          const { label, icon: Icon, color } = tabConfig[t];
          return (
            <a
              key={t}
              href={`/admin/verifikasi?tab=${t}`}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`h-4 w-4 ${tab === t ? color : ""}`} />
              {label}
            </a>
          );
        })}
      </div>

      {requestsWithUrls.length === 0 ? (
        <p className="text-center py-16 text-muted-foreground text-sm">
          Tidak ada permohonan dengan status ini.
        </p>
      ) : (
        <div className="space-y-3">
          {requestsWithUrls.map((req) => (
            <div key={req.id} className="bg-background border rounded-xl p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <p className="font-medium">{req.user.fullName}</p>
                  <p className="text-sm text-muted-foreground">
                    {req.user.email ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tab === "PENDING" ? "Diajukan" : "Diproses"}:{" "}
                    {new Date(tab === "PENDING" ? req.createdAt : req.updatedAt).toLocaleDateString(
                      "id-ID",
                      { day: "numeric", month: "long", year: "numeric" }
                    )}
                  </p>
                  {req.adminNotes && (
                    <p className="text-xs text-red-500 mt-1">
                      Catatan: {req.adminNotes}
                    </p>
                  )}
                </div>

                {tab === "PENDING" && req.ktpSignedUrl && (
                  <div className="flex gap-3">
                    <a href={req.ktpSignedUrl} target="_blank" rel="noopener noreferrer">
                      <div className="w-28 rounded-lg overflow-hidden border bg-muted hover:opacity-90 transition-opacity">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={req.ktpSignedUrl}
                          alt="KTP"
                          className="w-28 h-20 object-cover"
                        />
                        <p className="text-[10px] text-center text-muted-foreground py-0.5">KTP</p>
                      </div>
                    </a>
                    <a href={req.selfieSignedUrl!} target="_blank" rel="noopener noreferrer">
                      <div className="w-28 rounded-lg overflow-hidden border bg-muted hover:opacity-90 transition-opacity">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={req.selfieSignedUrl!}
                          alt="Selfie"
                          className="w-28 h-20 object-cover"
                        />
                        <p className="text-[10px] text-center text-muted-foreground py-0.5">Selfie + KTP</p>
                      </div>
                    </a>
                  </div>
                )}
              </div>

              {tab === "PENDING" && (
                <div className="mt-3 flex justify-end">
                  <ReviewRequestButtons requestId={req.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
