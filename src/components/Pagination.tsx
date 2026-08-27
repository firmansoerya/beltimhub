import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
}

export function Pagination({ currentPage, totalPages, buildHref }: PaginationProps) {
  if (totalPages <= 1) return null;

  // Show: 1 ... (current-1) current (current+1) ... last
  const pages: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <div className="flex items-center justify-center gap-1.5 pt-8">
      {currentPage > 1 && (
        <Link
          href={buildHref(currentPage - 1)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>
      )}
      {pages.map((p, idx) =>
        p === "..." ? (
          <span key={`dots-${idx}`} className="w-8 h-8 flex items-center justify-center text-muted-foreground text-sm">
            ...
          </span>
        ) : (
          <Link
            key={p}
            href={buildHref(p)}
            className={cn(
              "w-8 h-8 rounded-lg text-sm flex items-center justify-center transition-colors",
              currentPage === p
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {p}
          </Link>
        )
      )}
      {currentPage < totalPages && (
        <Link
          href={buildHref(currentPage + 1)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}
