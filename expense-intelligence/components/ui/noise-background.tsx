"use client";

import React, { useId } from "react";

interface NoiseBackgroundProps {
  children: React.ReactNode;
  containerClassName?: string;
  className?: string;
  gradientColors?: string[];
  noiseOpacity?: number;
  animationSpeed?: number;
}

export function NoiseBackground({
  children,
  containerClassName = "",
  className = "",
  gradientColors = ["rgb(56, 189, 248)", "rgb(167, 139, 250)", "rgb(244, 114, 182)"],
  noiseOpacity = 0.2,
  animationSpeed = 5,
}: NoiseBackgroundProps) {
  const filterId = useId().replace(/:/g, "nb");

  // Build a conic gradient that loops cleanly back to the first color
  const colors = [...gradientColors, gradientColors[0]];
  const stops = colors
    .map((c, i) => `${c} ${Math.round((i / (colors.length - 1)) * 100)}%`)
    .join(", ");

  return (
    <div
      className={`relative overflow-hidden ${containerClassName}`}
      style={{ isolation: "isolate" }}
    >
      {/* Spinning gradient layer — oversized so corners stay covered while rotating */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "-75%",
          left: "-75%",
          width: "250%",
          height: "250%",
          background: `conic-gradient(${stops})`,
          animation: `nb-spin ${animationSpeed}s linear infinite`,
          zIndex: 0,
        }}
      />

      {/* Noise grain overlay — blends with gradient */}
      <svg
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 1,
          pointerEvents: "none",
        }}
      >
        <defs>
          <filter id={filterId}>
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.75"
              numOctaves="4"
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
            <feBlend in="SourceGraphic" mode="overlay" result="blend" />
          </filter>
        </defs>
        <rect
          width="100%"
          height="100%"
          filter={`url(#${filterId})`}
          opacity={noiseOpacity}
        />
      </svg>

      {/* Children on top */}
      <div className={`relative ${className}`} style={{ zIndex: 2 }}>
        {children}
      </div>

      <style>{`
        @keyframes nb-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
