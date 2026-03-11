"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Pencil, CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";

interface Props {
  id: string;
  status: string;
}

export function FjbOwnerActions({ id, status }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function markAsSold() {
    if (!confirm("Tandai iklan ini sebagai sudah terjual?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SOLD" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Iklan ditandai sebagai terjual");
      router.refresh();
    } catch {
      toast.error("Gagal memperbarui");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <Link href={`/fjb/${id}/edit`}>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Pencil className="h-3.5 w-3.5" />
          Edit Iklan
        </Button>
      </Link>
      {status === "ACTIVE" && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-green-600 border-green-300 hover:bg-green-50"
          onClick={markAsSold}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle className="h-3.5 w-3.5" />
          )}
          Tandai Terjual
        </Button>
      )}
    </div>
  );
}
