import { brands } from "@/data/bda/brands";
import { projects } from "@/data/bda/projects";

export function getStats() {
  const countries = new Set(projects.map((p) => p.region));
  const brandsInUse = new Set(projects.map((p) => p.brandSlug));
  return {
    projectCount: projects.length,
    brandCount: brandsInUse.size,
    countryCount: countries.size,
    totalBrandCount: brands.length,
  };
}

export function projectCountForBrand(brandSlug: string) {
  return projects.filter((p) => p.brandSlug === brandSlug).length;
}
