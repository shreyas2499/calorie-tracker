"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/calories", label: "Calories" },
  { href: "/weight", label: "Weight" },
  { href: "/progress", label: "Progress" },
  { href: "/profile", label: "Profile" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between gap-4">
          <Link href="/" className="text-sm font-semibold tracking-tight text-ink">
            Calorie &amp; Weight Tracker
          </Link>
        </div>
        <nav aria-label="Main" className="-mx-1 flex gap-1 overflow-x-auto pb-2">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={
                  "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors " +
                  (active
                    ? "bg-accent/10 text-accent underline underline-offset-4"
                    : "text-muted hover:bg-line/40 hover:text-ink")
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
