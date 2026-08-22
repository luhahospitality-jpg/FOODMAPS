"use client";

import ProjectExplorer from "@/components/bda/ProjectExplorer";
import { useLocale } from "@/components/bda/LocaleContext";
import type { BrandCategory, ProjectRegion } from "@/types/bda";

type CategoryFilter = BrandCategory | "todas";
type RegionFilter = ProjectRegion | "todas";

export default function MapaPageClient({
  initialCategory,
  initialRegion,
  initialBrand,
}: {
  initialCategory: CategoryFilter;
  initialRegion: RegionFilter;
  initialBrand?: string;
}) {
  const { t } = useLocale();

  return (
    <div>
      <section className="mx-auto max-w-6xl px-5 pb-10 pt-16 sm:px-8 sm:pt-24">
        <p className="bda-mono text-[11px] uppercase tracking-[0.2em] text-bda-gold">
          {t("mapa_eyebrow")}
        </p>
        <h1 className="bda-serif mt-5 max-w-2xl text-4xl leading-[1.1] text-bda-ink sm:text-5xl">
          {t("mapa_titulo")}
        </h1>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
        <ProjectExplorer
          initialCategory={initialCategory}
          initialRegion={initialRegion}
          initialBrand={initialBrand}
        />
      </section>
    </div>
  );
}
