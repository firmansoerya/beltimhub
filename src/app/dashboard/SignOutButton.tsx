"use client";

import { SignOutButton } from "@clerk/nextjs";
import { LogOut } from "lucide-react";

export function DashboardSignOut() {
  return (
    <SignOutButton redirectUrl="/">
      <button className="flex w-full items-center gap-2.5 px-3 py-2 text-sm rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors">
        <LogOut className="h-4 w-4" />
        Keluar
      </button>
    </SignOutButton>
  );
}
