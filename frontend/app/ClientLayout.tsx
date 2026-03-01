"use client";
import { usePathname } from "next/navigation";
import SiteNav from "@/app/components/SiteNav";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  return (
    <>
      {!isHome && <SiteNav />}
      {children}
    </>
  );
}
