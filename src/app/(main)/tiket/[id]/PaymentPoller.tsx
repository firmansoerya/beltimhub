"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function PaymentPoller({ ticketId }: { ticketId: string }) {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 4000);
    return () => clearInterval(interval);
  }, [router, ticketId]);

  return null;
}
