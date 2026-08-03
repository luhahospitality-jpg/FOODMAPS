import type { ReactNode } from "react";

const variants = {
  mustard: "bg-mustard text-ink",
  pink: "bg-pink text-ink",
  blue: "bg-blue text-paper",
  red: "bg-red text-paper",
  ink: "bg-ink text-paper",
  paper: "bg-paper text-ink",
} as const;

export function Pill({
  children,
  variant = "ink",
  className = "",
}: {
  children: ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-3 py-1 font-label text-[11px] font-bold tracking-wide uppercase whitespace-nowrap ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
