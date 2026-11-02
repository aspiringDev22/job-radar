import type { CSSProperties } from "react";

import { cn } from "@/shared/lib/utils";

// Blips as [angle clockwise from 12 o'clock, distance from the centre as a share of the radius].
const BLIPS: Array<[number, number]> = [
  [38, 0.62],
  [112, 0.38],
  [168, 0.8],
  [235, 0.55],
  [300, 0.72],
  [330, 0.3],
];

const SWEEP_SECONDS = 4;

// Decoration only. With reduced motion the sweep and the blips stay still.
export function Radar({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("relative aspect-square rounded-full", className)}>
      <div className="absolute inset-0 rounded-full border border-signal/30 bg-signal/[0.04]" />
      <div className="absolute inset-[17%] rounded-full border border-signal/20" />
      <div className="absolute inset-[34%] rounded-full border border-signal/20" />
      <div className="absolute inset-y-0 left-1/2 w-px bg-signal/15" />
      <div className="absolute inset-x-0 top-1/2 h-px bg-signal/15" />
      <div
        className="absolute inset-0 rounded-full motion-safe:animate-[radar-sweep_4s_linear_infinite]"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, transparent 290deg, color-mix(in oklch, var(--signal) 40%, transparent) 360deg)",
        }}
      />
      {BLIPS.map(([angle, distance]) => {
        const radians = (angle * Math.PI) / 180;
        const style: CSSProperties = {
          left: `${50 + Math.sin(radians) * distance * 50}%`,
          top: `${50 - Math.cos(radians) * distance * 50}%`,
          animationDelay: `${(angle / 360) * SWEEP_SECONDS}s`,
        };
        return (
          <span
            key={angle}
            style={style}
            className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal opacity-60 shadow-[0_0_14px_var(--signal)] motion-safe:animate-[radar-blip_4s_ease-out_infinite]"
          />
        );
      })}
      <span className="absolute left-1/2 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal" />
    </div>
  );
}

// The logo mark: rings and a sweep, sized by the parent's font size.
export function RadarGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-[1.2em]", className)}>
      <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" />
      <path d="M12 12 L12 1.5 A10.5 10.5 0 0 1 21.1 6.75 Z" fill="currentColor" fillOpacity="0.45" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <circle cx="17.5" cy="7.5" r="1.4" fill="currentColor" />
    </svg>
  );
}
