import Link from "next/link";
import { AlertCircle, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FeatureDisabledNotice({
  featureName = "Halaman Ini",
  description = "Fitur ini sedang dinonaktifkan sementara oleh pengelola platform untuk pemeliharaan atau penyesuaian layanan.",
}: {
  featureName?: string;
  description?: string;
}) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center bg-card border rounded-2xl p-8 shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-5">
          <AlertCircle className="w-8 h-8" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 px-3 py-1 bg-amber-500/10 rounded-full">
          Fitur Dinonaktifkan
        </span>
        <h1 className="text-2xl font-bold mt-3 mb-2">
          {featureName} Sedang Ditutup
        </h1>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          {description}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/" className="w-full sm:w-auto">
            <Button className="w-full bg-teal-700 hover:bg-teal-800 text-white gap-2">
              <Home className="w-4 h-4" />
              Kembali ke Beranda
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
