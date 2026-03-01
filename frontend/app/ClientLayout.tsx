"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SIDEBAR_PAGES = ["/dashboard", "/profile", "/newEscrow"];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hasSidebar = SIDEBAR_PAGES.some((p) => pathname.startsWith(p));

  return (
    <>
      {!hasSidebar && (
        <Link
          href="/profile"
          aria-label="Go to profile"
          className="fixed top-4 left-4 z-[100] h-11 w-11 rounded-full ring-2 ring-white/70 shadow-lg overflow-hidden bg-neutral-800 hover:scale-105 transition-transform"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/userpfp.jpg"
            alt="Profile"
            className="h-full w-full object-cover"
          />
        </Link>
      )}

      {children}
    </>
  );
}
