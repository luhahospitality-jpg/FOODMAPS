"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import WorldMap from "./WorldMap";
import ProjectCard from "./ProjectCard";
import { projects as allProjects, regions } from "@/data/bda/projects";
import { getBrand, categoryLabel } from "@/data/bda/brands";
import type { BrandCategory, ProjectRegion } from "@/types/bda";

type CategoryFilter = BrandCategory | "todas";
type RegionFilter = ProjectRegion | "todas";

export default function ProjectExplorer({
  initialCategory = "todas",
  initialRegion = "todas",
  initialBrand,
}: {
  initialCategory?: CategoryFilter;
  initialRegion?: RegionFilter;
  initialBrand?: string;
}) {
  const [category, setCategory] = useState<CategoryFilter>(initialCategory);
  const [region, setRegion] = useState<RegionFilter>(initialRegion);
  const [brandFilter, setBrandFilter] = useState<string | undefined>(initialBrand);
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return allProjects.filter((p) => {
      if (brandFilter && p.brandSlug !== brandFilter) return false;
      const brand = getBrand(p.brandSlug);
      if (category !== "todas" && brand?.category !== category) return false;
      if (region !== "todas" && p.region !== region) return false;
      return true;
    });
  }, [category, region, brandFilter]);

  const activeBrand = brandFilter ? getBrand(brandFilter) : undefined;

  function handleSelect(slug: string) {
    setHoveredSlug(slug);
    const el = document.getElementById(`project-${slug}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4 border-b bda-hairline pb-6">
        <div className="flex flex-wrap gap-2">
          <FilterChip active={category === "todas"} onClick={() => setCategory("todas")}>
            Todas
          </FilterChip>
          {(["moda", "servicios", "lifestyle"] as BrandCategory[]).map((c) => (
            <FilterChip key={c} active={category === c} onClick={() => setCategory(c)}>
              {categoryLabel[c]}
            </FilterChip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterChip active={region === "todas"} onClick={() => setRegion("todas")}>
            Todos los países
          </FilterChip>
          {regions.map((r) => (
            <FilterChip key={r} active={region === r} onClick={() => setRegion(r)}>
              {r}
            </FilterChip>
          ))}
        </div>
        {activeBrand && (
          <button
            onClick={() => setBrandFilter(undefined)}
            className="bda-mono text-[10px] uppercase tracking-[0.14em] text-bda-gold underline underline-offset-4"
          >
            Marca: {activeBrand.name} · quitar ×
          </button>
        )}
        <span className="bda-mono ml-auto text-[10px] uppercase tracking-[0.14em] text-bda-muted">
          {filtered.length} {filtered.length === 1 ? "proyecto" : "proyectos"}
        </span>
      </div>

      <div className="mt-8">
        <WorldMap
          projects={filtered}
          hoveredSlug={hoveredSlug}
          onHover={setHoveredSlug}
          onSelect={handleSelect}
        />
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <ProjectCard
            key={p.slug}
            project={p}
            highlighted={hoveredSlug === p.slug}
            onMouseEnter={() => setHoveredSlug(p.slug)}
            onMouseLeave={() => setHoveredSlug(null)}
          />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full p-14 text-center text-sm text-bda-muted">
            Todavía no hay proyectos documentados con estos filtros.
          </p>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`bda-mono rounded-full border px-3.5 py-1.5 text-[10px] uppercase tracking-[0.14em] transition-colors ${
        active
          ? "border-bda-ink bg-bda-ink text-bda-bg"
          : "border-bda-line text-bda-muted hover:border-bda-ink hover:text-bda-ink"
      }`}
    >
      {children}
    </button>
  );
}
