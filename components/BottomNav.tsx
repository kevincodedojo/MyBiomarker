"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/markers", label: "Markers", icon: MarkersIcon },
  { href: "/add", label: "Add", icon: AddIcon },
  { href: "/insights", label: "Insights", icon: InsightsIcon },
  { href: "/profile", label: "Profile", icon: ProfileIcon },
] as const;

// Renders both navigation surfaces: a bottom tab bar on mobile and a left
// sidebar on desktop (lg+). Only one is visible at a time via breakpoints.
export default function BottomNav() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-edge bg-background/95 backdrop-blur lg:hidden"
      >
        <ul className="mx-auto flex max-w-md items-stretch justify-between px-6 pb-[env(safe-area-inset-bottom)]">
          {tabs.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center gap-1 px-2 py-3 text-xs ${
                    active ? "text-accent" : "text-fg-muted hover:text-fg-secondary"
                  }`}
                >
                  <Icon />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <nav
        aria-label="Primary"
        className="fixed inset-y-0 left-0 z-10 hidden w-60 flex-col border-r border-edge bg-background px-4 py-6 lg:flex"
      >
        <p className="flex items-center gap-2 px-3 pb-8 text-base font-bold">
          <span aria-hidden className="size-2.5 rounded-full bg-accent" />
          MyBiomarker
        </p>
        <ul className="flex flex-col gap-1">
          {tabs.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                    active
                      ? "bg-surface text-accent"
                      : "text-fg-secondary hover:bg-surface/60 hover:text-foreground"
                  }`}
                >
                  <Icon />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="mt-auto px-3 text-xs text-fg-muted">
          Not medical advice.
        </p>
      </nav>
    </>
  );
}

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}

function MarkersIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 16v-5M12 16V8M16 16v-3" />
    </svg>
  );
}

function AddIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function InsightsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3l2 5.5L20 10l-5.5 2L12 18l-2.5-6L4 10l6-1.5L12 3z" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
    </svg>
  );
}
