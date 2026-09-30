"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { PageTransition } from "@/components/motion/PageTransition";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");
  const isVaultRoute = pathname.startsWith("/vault");

  // Admin + vault get no page-transition wrapper on purpose: those flows
  // are form-heavy, and a fade-in on every server-action redirect would
  // feel laggy rather than polished. Public marketing surface benefits
  // from the transition; internal tooling does not.
  if (isAdminRoute || isVaultRoute) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-64">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
