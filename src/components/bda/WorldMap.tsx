"use client";

import { CONTINENTS, MAP_HEIGHT, MAP_WIDTH, project, toPath } from "@/lib/bda/geo";
import type { Project, BrandCategory } from "@/types/bda";
import { getBrand } from "@/data/bda/brands";

const categoryColor: Record<BrandCategory, string> = {
  moda: "var(--bda-moda)",
  servicios: "var(--bda-servicios)",
  lifestyle: "var(--bda-lifestyle)",
};

export default function WorldMap({
  projects,
  hoveredSlug,
  onHover,
  onSelect,
}: {
  projects: Project[];
  hoveredSlug: string | null;
  onHover: (slug: string | null) => void;
  onSelect: (slug: string) => void;
}) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border bda-hairline bg-bda-bg-raised">
      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label="Mapa mundial de branded residences documentadas"
      >
        {CONTINENTS.map((poly, i) => (
          <path
            key={i}
            d={toPath(poly)}
            fill="rgba(23,20,15,0.06)"
            stroke="rgba(23,20,15,0.14)"
            strokeWidth={0.6}
          />
        ))}
        {projects.map((p) => {
          const [x, y] = project(p.lat, p.lng);
          const brand = getBrand(p.brandSlug);
          const color = brand ? categoryColor[brand.category] : "var(--bda-gold)";
          const isHovered = hoveredSlug === p.slug;
          return (
            <g
              key={p.slug}
              transform={`translate(${x},${y})`}
              className="cursor-pointer"
              onMouseEnter={() => onHover(p.slug)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onSelect(p.slug)}
            >
              <circle
                r={isHovered ? 9 : 6}
                fill={color}
                opacity={0.18}
                className="transition-all"
              />
              <circle
                r={isHovered ? 4.5 : 3}
                fill={color}
                stroke="var(--bda-bg-raised)"
                strokeWidth={1}
                className="transition-all"
              />
              {isHovered && (
                <text
                  y={-12}
                  textAnchor="middle"
                  style={{
                    fill: "var(--bda-ink)",
                    fontSize: 9,
                    fontFamily: "var(--font-bda-mono)",
                  }}
                >
                  {p.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
