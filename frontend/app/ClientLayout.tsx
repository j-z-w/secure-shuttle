"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { SOUNDS, playSound } from "@/app/lib/sounds";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const prevPath = useRef(pathname);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingPlaying = useRef(false);

  /* ── Route-change sound ── */
  useEffect(() => {
    if (pathname !== prevPath.current) {
      playSound(SOUNDS.changeWindow);
      prevPath.current = pathname;
    }
  }, [pathname]);

  /* ── Button-click sound (delegated) ── */
  const handleClick = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    const interactive = target.closest(
      'button, a, [role="button"], input[type="submit"], input[type="button"]'
    );
    if (interactive) {
      playSound(SOUNDS.button);
    }
  }, []);

  /* ── Typing sound (throttled) ── */
  const handleInput = useCallback((e: Event) => {
    const target = e.target as HTMLElement | null;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement
    ) {
      if (!typingPlaying.current) {
        typingPlaying.current = true;
        playSound(SOUNDS.typing, 0.2);
      }

      // Reset cooldown on each keystroke
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        typingPlaying.current = false;
      }, 180);
    }
  }, []);

  /* ── Attach global listeners ── */
  useEffect(() => {
    document.addEventListener("click", handleClick, true);
    document.addEventListener("input", handleInput, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("input", handleInput, true);
    };
  }, [handleClick, handleInput]);

  return <>{children}</>;
}
