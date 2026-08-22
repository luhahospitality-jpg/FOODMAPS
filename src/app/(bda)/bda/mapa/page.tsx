import type { Metadata } from "next";
import MapaPageClient from "./MapaPageClient";
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
    <MapaPageClient
      initialCategory={initialCategory}
      initialRegion={initialRegion}
      initialBrand={initialBrand}
    />
  );
}
