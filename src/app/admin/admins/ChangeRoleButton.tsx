"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Props {
  userId: string;
  currentRole: string;
  options: { label: string; role: string }[];
}

export function ChangeRoleButton({ userId, options }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  async function changeRole(role: string, label: string) {
    setLoading(role);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${label} berhasil`);
      router.refresh();
    } catch {
      toast.error("Gagal mengubah role");
    } finally {
      setLoading(null);
    }
  }

  if (options.length === 1) {
    const { label, role } = options[0];
    return (
      <Button
        size="sm"
        variant="outline"
        className="text-xs h-7"
        onClick={() => changeRole(role, label)}
        disabled={!!loading}
      >
        {loading === role ? <Loader2 className="h-3 w-3 animate-spin" /> : label}
      </Button>
    );
  }

  return (
    <div className="flex gap-1.5 justify-end flex-wrap">
      {options.map(({ label, role }) => (
        <Button
          key={role}
          size="sm"
          variant="outline"
          className="text-xs h-7"
          onClick={() => changeRole(role, label)}
          disabled={!!loading}
        >
          {loading === role ? <Loader2 className="h-3 w-3 animate-spin" /> : label}
        </Button>
      ))}
    </div>
  );
}
