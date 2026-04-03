import { cn } from "@/lib/utils";
import React, { ReactNode } from "react";

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children: ReactNode;
  showRadialGradient?: boolean;
}

export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) => {
  return (
    <main
      className={cn("relative min-h-screen bg-black text-white overflow-hidden", className)}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0">
        {/* Vivid color layer */}
        <div
          className={cn(
            "absolute -inset-[12%] opacity-50 blur-3xl animate-aurora",
            "[background-image:radial-gradient(circle_at_15%_25%,rgba(245,158,11,0.28),transparent_40%),radial-gradient(circle_at_80%_75%,rgba(6,182,212,0.22),transparent_40%),radial-gradient(circle_at_50%_5%,rgba(139,92,246,0.18),transparent_45%),radial-gradient(circle_at_65%_50%,rgba(16,185,129,0.12),transparent_35%)]",
            showRadialGradient &&
              "[mask-image:radial-gradient(ellipse_at_top,black_40%,transparent_80%)]"
          )}
        />
        {/* Subtle grain overlay for depth */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
            backgroundSize: "256px 256px",
          }}
        />
      </div>
      {children}
    </main>
  );
};
