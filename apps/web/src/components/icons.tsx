// Stroke icons in the style of SF Symbols. Decorative: always hidden from screen readers.
import type { JSX } from "react";
import type { StarterIcon } from "../lib/questions.ts";

interface IconProps {
  className?: string;
}

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
};

export function ArrowUpIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} strokeWidth={2.4}>
      <path d="M12 19V5" />
      <path d="m5.5 11.5 6.5-6.5 6.5 6.5" />
    </svg>
  );
}

export function ChevronIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} strokeWidth={2.4}>
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

export function RetryIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20 4v5h-5" />
    </svg>
  );
}

export function ComposeIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 5H6.5A2.5 2.5 0 0 0 4 7.5v10A2.5 2.5 0 0 0 6.5 20h10a2.5 2.5 0 0 0 2.5-2.5V12" />
      <path d="M17.6 3.9a2 2 0 0 1 2.8 2.8L13 14l-3.5 1 1-3.5z" />
    </svg>
  );
}

export function PanelIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="4.5" width="18" height="15" rx="3" />
      <path d="M14.5 4.5v15" />
    </svg>
  );
}

export function InfoIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5" />
      <path d="M12 7.6h.01" strokeWidth={2.6} />
    </svg>
  );
}

export function AlertIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M10.3 4 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 4a2 2 0 0 0-3.4 0z" />
      <path d="M12 9.5v4" />
      <path d="M12 17.2h.01" strokeWidth={2.6} />
    </svg>
  );
}

function ReturnGlyph() {
  return (
    <>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </>
  );
}

function TruckGlyph() {
  return (
    <>
      <path d="M2.5 6.5h11v9.5h-11z" />
      <path d="M13.5 9.5h4l3 3.2V16h-7" />
      <circle cx="7" cy="17.5" r="1.8" />
      <circle cx="17" cy="17.5" r="1.8" />
    </>
  );
}

function CardGlyph() {
  return (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 9.8h19" />
      <path d="M6.5 15h4" />
    </>
  );
}

function AlertGlyph() {
  return (
    <>
      <path d="M10.3 4 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 4a2 2 0 0 0-3.4 0z" />
      <path d="M12 9.5v4" />
      <path d="M12 17.2h.01" strokeWidth={2.6} />
    </>
  );
}

const GLYPHS: Record<StarterIcon, () => JSX.Element> = {
  return: ReturnGlyph,
  truck: TruckGlyph,
  card: CardGlyph,
  alert: AlertGlyph,
};

export function TopicIcon({ icon, className }: IconProps & { icon: StarterIcon }) {
  const Glyph = GLYPHS[icon];
  return (
    <svg {...base} className={className} strokeWidth={2.1}>
      <Glyph />
    </svg>
  );
}
