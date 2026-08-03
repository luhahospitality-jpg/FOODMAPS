import type { SourceType, DistinctionType } from "@/types/city";

export const sourceTypeLabel: Record<NonNullable<SourceType>, string> = {
  timeout: "Time Out",
  influencer: "Influencer",
  tv_show: "TV / Cine",
  viral_social: "Viral",
  classic: "Clásico",
};

export const distinctionLabel: Record<DistinctionType, string> = {
  michelin_star: "Estrella Michelin",
  michelin_bib_gourmand: "Bib Gourmand",
  repsol_sol: "Sol Repsol",
};

export const categoryLabel: Record<string, string> = {
  fast_food: "Fast food",
  bakery: "Panadería",
  coffee: "Café",
  bar: "Bar",
  pizza: "Pizza",
  steakhouse: "Steakhouse",
  seafood: "Mariscos",
  brunch: "Brunch",
  fine_dining: "Fine dining",
  street_food: "Street food",
  dessert: "Postres",
};

export function categoryText(category: string): string {
  return categoryLabel[category] ?? category;
}
