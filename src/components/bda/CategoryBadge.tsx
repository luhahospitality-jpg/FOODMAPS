"use client";

import type { BrandCategory } from "@/types/bda";
import { useLocale } from "@/components/bda/LocaleContext";
import { categoryLabelI18n } from "@/data/bda/i18n";

const dot: Record<BrandCategory, string> = {
  moda: "bg-bda-moda",
  servicios: "bg-bda-servicios",
  lifestyle: "bg-bda-lifestyle",
};

export default function CategoryBadge({
  category,
  className = "",
}: {
  category: BrandCategory;
  className?: string;
}) {
  const { locale } = useLocale();

  return (
    <span
      className={`bda-mono inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-bda-muted ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot[category]}`} />
      {categoryLabelI18n[locale][category]}
    </span>
  );
}
