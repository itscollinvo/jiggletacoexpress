"use client";

/**
 * Sidebar with desktop-fixed / mobile-drawer behavior.
 *
 * "use client" because we need:
 *  - useState for the drawer open/close
 *  - usePathname to mark the active link
 * Both are browser-only React hooks.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, FolderGit2, User, BookOpen, Home } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/projects", label: "Projects", icon: FolderGit2 },
  { href: "/about", label: "About", icon: User },
  { href: "/blog", label: "Blog", icon: BookOpen },
];

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Mobile-only top bar with the hamburger trigger */}
      <div className="fixed top-0 right-0 left-0 z-30 flex items-center justify-between border-b border-border bg-background px-4 py-3 lg:hidden">
        <Link
          href="/"
          className="font-semibold text-foreground"
          onClick={() => setOpen(false)}
        >
          jiggletaco
        </Link>
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen(!open)}
          className="rounded-md p-2 hover:text-accent-hover"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile-only backdrop. Clicking it closes the drawer. */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* The sidebar itself.
       *  - Always fixed on the left at full screen height
       *  - On desktop (lg:) always visible (translate-x-0)
       *  - On mobile, slides in/out based on `open` state */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen w-64 border-r border-border bg-background transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex h-full flex-col p-6">
          <Link
            href="/"
            className="mb-10 text-xl font-bold text-foreground transition-colors hover:text-accent-coral"
            onClick={() => setOpen(false)}
          >
            jiggletaco
          </Link>

          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-accent-coral/10 text-accent-coral"
                      : "text-foreground/80 hover:bg-foreground/5 hover:text-accent-hover"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto">
            <ThemeToggle />
          </div>
        </div>
      </aside>
    </>
  );
}
