import type { Metadata } from "next";
import ProjectExplorer from "@/components/bda/ProjectExplorer";
import { regions } from "@/data/bda/projects";
import { getBrand } from "@/data/bda/brands";
import type { BrandCategory, ProjectRegion } from "@/types/bda";

export const metadata: Metadata = {
  title: "Mapa Global — BDA",
  description:
    "Todas las branded residences documentadas por BDA, en un mapa: por marca, categoría y país.",
};

const CATEGORIES: BrandCategory[] = ["moda", "servicios", "lifestyle"];

export default async function MapaPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const marca = typeof params.marca === "string" ? params.marca : undefined;
  const categoriaParam =
    typeof params.categoria === "string" ? params.categoria : undefined;
  const regionParam = typeof params.region === "string" ? params.region : undefined;

  const initialBrand = marca && getBrand(marca) ? marca : undefined;
  const initialCategory =
    categoriaParam && CATEGORIES.includes(categoriaParam as BrandCategory)
      ? (categoriaParam as BrandCategory)
      : "todas";
  const initialRegion =
    regionParam && (regions as readonly string[]).includes(regionParam)
      ? (regionParam as ProjectRegion)
      : "todas";

  return (
    <div>
      <section className="mx-auto max-w-6xl px-5 pb-10 pt-16 sm:px-8 sm:pt-24">
        <p className="bda-mono text-[11px] uppercase tracking-[0.2em] text-bda-gold">
          Mapa Global
        </p>
        <h1 className="bda-serif mt-5 max-w-2xl text-4xl leading-[1.1] text-bda-ink sm:text-5xl">
          Cada proyecto, en su lugar.
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-bda-muted">
          Un registro documental, no una vitrina comercial. Filtra por marca,
          categoría o país y recorre el mapa.
        </p>
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
