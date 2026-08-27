"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Menu, ShieldCheck, ChevronRight, ChevronDown,
  LayoutDashboard, BadgeCheck, Users, ShoppingBag,
  Wallet, CircleDollarSign, Settings2, Newspaper,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, BadgeCheck, Users, ShoppingBag,
  Wallet, CircleDollarSign, ShieldCheck, Settings2, Newspaper,
};

export interface NavChildItem {
  label: string;
  href: string;
  badge?: number;
}

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge: number;
  children?: NavChildItem[];
}

interface Props {
  navItems: NavItem[];
  mobile?: boolean;
  userName?: string | null;
  userRole?: string | null;
}

function isChildItemActive(pathname: string, currentTab: string | null, childHref: string): boolean {
  const childUrl = new URL(childHref, "http://localhost");
  const childPathname = childUrl.pathname;
  const childTab = childUrl.searchParams.get("tab");

  if (pathname !== childPathname) return false;

  // Exact tab match
  if (childTab) {
    if (currentTab === childTab) return true;

    // Special default tab handling when no tab param in URL
    if (!currentTab) {
      if (childPathname === "/admin/users" && childTab === "PENDING") return true;
      if (childPathname === "/admin/marketplace" && childTab === "PENDING_REVIEW") return true;
      if (childPathname === "/admin/withdrawals" && childTab === "ringkasan") return true;
      if (childPathname === "/admin/site-settings" && childTab === "features") return true;
    }

    // When in verify status tabs on /admin/users (PENDING / APPROVED / REJECTED)
    if (childPathname === "/admin/users" && childTab === "PENDING") {
      return ["PENDING", "APPROVED", "REJECTED"].includes(currentTab || "PENDING");
    }

    // When in verify status tabs on /admin/marketplace (PENDING_REVIEW / APPROVED / REJECTED)
    if (childPathname === "/admin/marketplace" && childTab === "PENDING_REVIEW") {
      return ["PENDING_REVIEW", "APPROVED", "REJECTED"].includes(currentTab || "PENDING_REVIEW");
    }

    return false;
  }

  // No childTab: matches when pathname matches and currentTab is empty or matches standalone child
  return true;
}

function NavItemRow({
  item,
  onItemClick,
}: {
  item: NavItem;
  onItemClick?: () => void;
}) {
  const Icon = ICON_MAP[item.icon] || LayoutDashboard;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");

  const hasChildren = item.children && item.children.length > 0;
  const isParentActive = item.href === "/admin"
    ? pathname === "/admin"
    : pathname.startsWith(item.href) || (hasChildren && item.children!.some(c => isChildItemActive(pathname, currentTab, c.href)));

  // Auto-expand if active
  const [expanded, setExpanded] = useState(isParentActive);

  useEffect(() => {
    if (isParentActive) {
      setExpanded(true);
    }
  }, [isParentActive]);

  return (
    <div className="flex flex-col">
      <div className="flex items-center">
        <Link
          href={item.children ? item.children[0].href : item.href}
          onClick={onItemClick}
          className={cn(
            "flex-1 flex items-center gap-2.5 px-3 py-2 text-sm rounded-md transition-colors",
            isParentActive && !hasChildren
              ? "bg-primary/10 text-primary font-medium"
              : isParentActive
                ? "text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          <Icon className={cn("h-4 w-4 shrink-0", isParentActive ? "text-primary" : "text-muted-foreground")} />
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge > 0 && (
            <span className="bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shrink-0">
              {item.badge > 99 ? "99+" : item.badge}
            </span>
          )}
        </Link>

        {hasChildren && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setExpanded((prev) => !prev);
            }}
            className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors"
            aria-label={expanded ? "Tutup submenu" : "Buka submenu"}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        )}
      </div>

      {/* Child Submenu */}
      {hasChildren && expanded && (
        <div className="ml-4 pl-3 border-l border-border/60 mt-1 space-y-0.5 mb-1">
          {item.children!.map((child) => {
            const isChildActive = isChildItemActive(pathname, currentTab, child.href);

            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onItemClick}
                className={cn(
                  "flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs rounded-md transition-colors",
                  isChildActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      isChildActive ? "bg-primary" : "bg-muted-foreground/40"
                    )}
                  />
                  <span className="truncate">{child.label}</span>
                </div>
                {child.badge && child.badge > 0 ? (
                  <span className="bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 shrink-0">
                    {child.badge > 99 ? "99+" : child.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AdminSidebarNav({ navItems, mobile, userName, userRole }: Props) {
  const [open, setOpen] = useState(false);

  // Desktop: just render nav links
  if (!mobile) {
    return (
      <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavItemRow key={item.href} item={item} />
        ))}
      </nav>
    );
  }

  // Mobile: render hamburger + sheet
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="p-1.5 -ml-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" aria-label="Menu admin">
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0 flex flex-col h-full">
        <SheetTitle className="sr-only">Menu Admin</SheetTitle>
        <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <span className="font-bold text-lg">Panel Admin</span>
        </div>
        <nav className="flex-1 flex flex-col gap-1 p-3 overflow-y-auto">
          {navItems.map((item) => (
            <NavItemRow key={item.href} item={item} onItemClick={() => setOpen(false)} />
          ))}
        </nav>
        <div className="mt-auto border-t p-3 space-y-1 shrink-0">
          {userName && (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              {userName}
              {userRole && (
                <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium uppercase">
                  {userRole}
                </span>
              )}
            </div>
          )}
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            Ke Beranda
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
