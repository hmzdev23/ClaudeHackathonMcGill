"use client";

import { useEffect, useRef, useState } from "react";

interface BlurFadeProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  inView?: boolean;
  className?: string;
  yOffset?: number;
}

export function BlurFade({
  children,
  delay = 0,
  duration = 0.65,
  inView = false,
  className,
  yOffset = 20,
}: BlurFadeProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Always start invisible so the animation plays
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!inView) {
      // Animate in on mount — small delay so the hidden state is painted first
      const timer = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(timer);
    }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -30px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [inView]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        filter: visible ? "blur(0px)" : "blur(12px)",
        transform: visible ? "translateY(0px)" : `translateY(${yOffset}px)`,
        transition: `opacity ${duration}s cubic-bezier(0.16,1,0.3,1) ${delay}s, filter ${duration}s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform ${duration}s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
        willChange: "opacity, filter, transform",
      }}
    >
      {children}
    </div>
  );
}
