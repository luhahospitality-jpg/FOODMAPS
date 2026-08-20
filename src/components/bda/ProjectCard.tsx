import Link from "next/link";
import type { Project } from "@/types/bda";
import { getBrand } from "@/data/bda/brands";
import CategoryBadge from "./CategoryBadge";
import ProjectPlate from "./ProjectPlate";

export default function ProjectCard({
  project,
  highlighted = false,
  onMouseEnter,
  onMouseLeave,
}: {
  project: Project;
  highlighted?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const brand = getBrand(project.brandSlug);

  return (
    <Link
      id={`project-${project.slug}`}
      href={`/bda/mapa/${project.slug}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`group flex scroll-mt-24 flex-col overflow-hidden rounded-2xl border bda-hairline bg-bda-bg-raised transition-colors hover:border-bda-gold/50 ${
        highlighted ? "border-bda-gold/50" : ""
      }`}
    >
      {brand && <ProjectPlate name={brand.name} category={brand.category} />}
      <div className="flex flex-1 flex-col p-6">
        {brand && <CategoryBadge category={brand.category} />}
        <p className="bda-serif mt-2 text-lg leading-snug text-bda-ink">
          {project.name}
        </p>
        <p className="mt-1 text-xs text-bda-muted">
          {brand?.name} · {project.city}
        </p>
        <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-bda-ink/70">
          {project.description}
        </p>
        <span className="bda-mono mt-5 text-[10px] uppercase tracking-[0.14em] text-bda-muted transition-transform group-hover:translate-x-1">
          Ver ficha →
        </span>
      </div>
    </Link>
  );
}
