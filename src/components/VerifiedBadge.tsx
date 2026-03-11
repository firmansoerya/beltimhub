import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface VerifiedBadgeProps {
  className?: string;
  size?: "sm" | "md";
}

export function VerifiedBadge({ className, size = "sm" }: VerifiedBadgeProps) {
  return (
    <BadgeCheck
      className={cn(
        "text-blue-500 inline-block shrink-0",
        size === "sm" ? "h-4 w-4" : "h-5 w-5",
        className
      )}
    />
  );
}
