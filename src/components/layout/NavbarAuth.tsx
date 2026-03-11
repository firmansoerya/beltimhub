"use client";

import Link from "next/link";
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function NavbarAuth() {
  const { isSignedIn } = useUser();
  const [dashHref, setDashHref] = useState("/dashboard");
  const [label, setLabel] = useState("Dashboard");

  useEffect(() => {
    if (!isSignedIn) return;
    fetch("/api/me/role")
      .then((r) => r.json())
      .then((data) => {
        if (data.role === "ADMIN" || data.role === "MODERATOR") {
          setDashHref("/admin");
          setLabel("Panel Admin");
        }
      })
      .catch(() => {});
  }, [isSignedIn]);

  if (isSignedIn) {
    return (
      <>
        <Link href={dashHref}>
          <Button variant="outline" size="sm">{label}</Button>
        </Link>
        <UserButton />
      </>
    );
  }

  return (
    <>
      <SignInButton mode="modal">
        <Button variant="ghost" size="sm">Masuk</Button>
      </SignInButton>
      <SignUpButton mode="modal">
        <Button size="sm">Daftar</Button>
      </SignUpButton>
    </>
  );
}
