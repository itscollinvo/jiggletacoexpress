"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { PageTransition } from "@/components/motion/PageTransition";
import { SmoothScroll } from "@/components/SmoothScroll";
import { ThreeProvider } from "@/components/three/ThreeProvider";

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

  // Public pages get the shared 3D stage and smooth scrolling. Both are
  // no-ops until something uses them: the canvas only loads when a page
  // mounts a <SceneSlot>, and smooth scroll only runs on desktop with
  // motion allowed.
  return (
    <ThreeProvider>
      <SmoothScroll />
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 lg:ml-64">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </ThreeProvider>
  );
}
