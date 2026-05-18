"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");
  const isVaultRoute = pathname.startsWith("/vault");

  if (isAdminRoute || isVaultRoute) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-64">{children}</main>
    </div>
  );
}
