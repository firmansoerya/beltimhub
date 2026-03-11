"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Props {
  userId: string;
  isVerified: boolean;
}

export function VerifyUserButton({ userId, isVerified }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVerified: !isVerified }),
      });
      if (!res.ok) throw new Error();
      toast.success(isVerified ? "Verifikasi dicabut" : "User berhasil diverifikasi");
      router.refresh();
    } catch {
      toast.error("Gagal mengubah status verifikasi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      size="sm"
      variant={isVerified ? "outline" : "default"}
      onClick={toggle}
      disabled={loading}
      className="text-xs h-7"
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : isVerified ? (
        "Cabut Verifikasi"
      ) : (
        "Verifikasi"
      )}
    </Button>
  );
}
