"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Today" },
  { href: "/week", label: "Week" },
  { href: "/journey", label: "Journey" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex gap-1 rounded-full border border-white/10 p-1">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`min-h-9 rounded-full px-3.5 py-1.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
              active ? "bg-gold text-night" : "text-slate hover:text-parchment"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
