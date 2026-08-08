'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export function RouteProgress() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear any previous timers
    if (timerRef.current) clearInterval(timerRef.current);
    if (hideRef.current) clearTimeout(hideRef.current);

    // Start bar
    setProgress(10);
    setVisible(true);

    // Increment quickly to ~85% then slow down (never reach 100 until done)
    timerRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 85) {
          clearInterval(timerRef.current!);
          return 85;
        }
        // Fast at first, slow near 85
        return p + Math.max(1, (85 - p) * 0.12);
      });
    }, 60);

    // Complete bar shortly after route change
    const completeTimer = setTimeout(() => {
      if (timerRef.current) clearInterval(timerRef.current);
      setProgress(100);
      hideRef.current = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 250);
    }, 300);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (hideRef.current) clearTimeout(hideRef.current);
      clearTimeout(completeTimer);
    };
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-blue-600 transition-all duration-150 ease-out shadow-[0_0_8px_2px_rgba(37,99,235,0.4)]"
      style={{ width: `${progress}%`, transition: progress === 100 ? 'width 0.15s ease-out' : undefined }}
    />
  );
}