"use client";

import Link from "next/link";
import type { Brand, Project } from "@/types/bda";
import CategoryBadge from "@/components/bda/CategoryBadge";
import ProjectPlate from "@/components/bda/ProjectPlate";
import ProjectCard from "@/components/bda/ProjectCard";
import { useLocale } from "@/components/bda/LocaleContext";
import { projectDescI18n, regionLabelI18n, localizeField } from "@/data/bda/i18n";

export default function ProjectPageClient({
  project,
  brand,
  related,
  relatedByRegion,
}: {
  project: Project;
  brand: Brand | undefined;
  related: Project[];
  relatedByRegion: Project[];
}) {
  const { locale, t } = useLocale();
  const regionLabel = regionLabelI18n[locale];
  const description =
    locale === "es" ? project.description : projectDescI18n[project.slug]?.[locale] ?? project.description;

  const facts: Array<[string, string]> = [
    [t("ciudad"), project.city],
    [t("pais"), regionLabel[project.region] ?? project.region],
    [t("marca"), brand?.name ?? "—"],
  ];
  if (project.status) facts.push([t("estado"), localizeField(project.status, locale) ?? project.status]);
  if (project.developer) facts.push([t("desarrollador"), project.developer]);
  if (project.units) facts.push([t("unidades"), localizeField(project.units, locale) ?? project.units]);
  if (project.credits) facts.push([t("creditos"), localizeField(project.credits, locale) ?? project.credits]);

  return (
    <div>
      <section className="mx-auto max-w-6xl px-5 pb-10 pt-10 sm:px-8 sm:pt-16">
        <Link
          href="/bda/mapa"
          className="bda-mono text-[10px] uppercase tracking-[0.14em] text-bda-muted hover:text-bda-ink"
        >
          ← {t("nav_mapa")}
        </Link>
      </section>

      {brand && (
        <section className="mx-auto max-w-6xl px-5 sm:px-8">
          <ProjectPlate
            name={brand.name}
            category={brand.category}
            rounded="rounded-2xl"
            className="max-h-[420px] border bda-hairline"
          />
        </section>
      )}

      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-[1fr_260px] sm:gap-16">
          <div>
            {brand && <CategoryBadge category={brand.category} />}
            <h1 className="bda-serif mt-3 text-3xl leading-[1.1] text-bda-ink sm:text-4xl">
              {project.name}
            </h1>
            <p className="mt-2 text-sm text-bda-muted">
              {brand?.name} · {project.city}
            </p>
            <p className="bda-serif mt-8 max-w-lg text-xl italic leading-snug text-bda-ink/80">
              {description}
            </p>
          </div>

          <dl className="h-fit space-y-4 border-t bda-hairline pt-6 sm:border-t-0 sm:border-l sm:pl-8 sm:pt-0">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="bda-mono text-[10px] uppercase tracking-[0.14em] text-bda-muted">
                  {label}
                </dt>
                <dd className="mt-1 text-sm text-bda-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {relatedByRegion.length > 0 && (
        <section className="border-t bda-hairline">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
            <h2 className="bda-serif text-xl text-bda-ink">
              {related.length > 0
                ? `${t("otros_proyectos_de")} ${brand?.name}`
                : `${t("otros_proyectos_en")} ${regionLabel[project.region] ?? project.region}`}
            </h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              {relatedByRegion.map((p) => (
                <ProjectCard key={p.slug} project={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
