import type { Distinction, Lang } from "@/types/city";
import { distinctionLabel, distinctionBadgeTitle } from "@/lib/labels";

const style: Record<
  Distinction["type"],
  { bg: string; text: string; icon: React.ReactNode }
> = {
  michelin_star: {
    bg: "bg-red",
    text: "text-paper",
    icon: (
      <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true">
        <path d="M12 1.5l2.9 6.6 7.1.7-5.4 4.8 1.6 7-6.2-3.7-6.2 3.7 1.6-7-5.4-4.8 7.1-.7z" />
      </svg>
    ),
  },
  michelin_bib_gourmand: {
    bg: "bg-ink",
    text: "text-paper",
    icon: (
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M7 2v8a2 2 0 0 0 4 0V2M9 10v12M17 2c-2 2-2 5-2 7a2 2 0 0 0 4 0c0-2 0-5-2-7zM17 14v8" strokeLinecap="round" />
      </svg>
    ),
  },
  repsol_sol: {
    bg: "bg-mustard",
    text: "text-ink",
    icon: (
      <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true">
        <circle cx="12" cy="12" r="4.5" />
        <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="12" y1="1.5" x2="12" y2="4" />
          <line x1="12" y1="20" x2="12" y2="22.5" />
          <line x1="1.5" y1="12" x2="4" y2="12" />
          <line x1="20" y1="12" x2="22.5" y2="12" />
          <line x1="4.4" y1="4.4" x2="6.1" y2="6.1" />
          <line x1="17.9" y1="17.9" x2="19.6" y2="19.6" />
          <line x1="4.4" y1="19.6" x2="6.1" y2="17.9" />
          <line x1="17.9" y1="6.1" x2="19.6" y2="4.4" />
        </g>
      </svg>
    ),
  },
};

export function DistinctionBadge({
  distinction,
  lang = "es",
}: {
  distinction: Distinction;
  lang?: Lang;
}) {
  const s = style[distinction.type];
  const label = distinctionLabel(lang, distinction.type);
  const suffix =
    distinction.count && distinction.count > 1 ? ` ×${distinction.count}` : "";

  return (
    <span
      title={`${label}${suffix} — ${distinctionBadgeTitle(lang)}`}
      className={`inline-flex items-center gap-1 rounded-full border-2 border-ink px-2.5 py-1 font-label text-[10px] font-bold tracking-wide uppercase ${s.bg} ${s.text}`}
    >
      {s.icon}
      {label}
      {suffix}
    </span>
  );
}
