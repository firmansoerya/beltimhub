"use client";

import { SignOutButton } from "@clerk/nextjs";
import { LogOut } from "lucide-react";

export function DashboardSignOut() {
  return (
    <SignOutButton redirectUrl="/">
      <button className="flex w-full items-center gap-2.5 px-3 py-2 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
        <LogOut className="h-4 w-4" />
        Keluar
      </button>
    </SignOutButton>
  );
}
