"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  productId: string;
  currentStatus: string;
}

export function ProductActions({ productId, currentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function updateStatus(status: "ACTIVE" | "INACTIVE") {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      toast.success(status === "ACTIVE" ? "Produk diaktifkan" : "Produk dinonaktifkan");
      router.refresh();
    } catch {
      toast.error("Gagal memperbarui produk");
    } finally {
      setLoading(false);
    }
  }

  async function deleteProduct() {
    if (!confirm("Hapus produk ini?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Produk dihapus");
      router.refresh();
    } catch {
      toast.error("Gagal menghapus produk");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={loading}
        className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {currentStatus === "ACTIVE" ? (
          <DropdownMenuItem onClick={() => updateStatus("INACTIVE")}>
            <EyeOff className="h-4 w-4 mr-2" />
            Nonaktifkan
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => updateStatus("ACTIVE")}>
            <Eye className="h-4 w-4 mr-2" />
            Aktifkan
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={deleteProduct} className="text-destructive focus:text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Hapus
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
