import type { SourceType, DistinctionType, Lang } from "@/types/city";

const sourceTypeLabels: Record<Lang, Record<NonNullable<SourceType>, string>> = {
  es: {
    timeout: "Time Out",
    influencer: "Influencer",
    tv_show: "TV / Cine",
    viral_social: "Viral",
    classic: "Clásico",
  },
  en: {
    timeout: "Time Out",
    influencer: "Influencer",
    tv_show: "TV / Film",
    viral_social: "Viral",
    classic: "Classic",
  },
};

const distinctionLabels: Record<Lang, Record<DistinctionType, string>> = {
  es: {
    michelin_star: "Estrella Michelin",
    michelin_bib_gourmand: "Bib Gourmand",
    repsol_sol: "Sol Repsol",
  },
  en: {
    michelin_star: "Michelin Star",
    michelin_bib_gourmand: "Bib Gourmand",
    repsol_sol: "Repsol Sun",
  },
};

const categoryLabels: Record<Lang, Record<string, string>> = {
  es: {
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
  },
  en: {
    fast_food: "Fast food",
    bakery: "Bakery",
    coffee: "Coffee",
    bar: "Bar",
    pizza: "Pizza",
    steakhouse: "Steakhouse",
    seafood: "Seafood",
    brunch: "Brunch",
    fine_dining: "Fine dining",
    street_food: "Street food",
    dessert: "Dessert",
  },
};

export function sourceTypeLabel(lang: Lang, type: NonNullable<SourceType>): string {
  return sourceTypeLabels[lang][type];
}

export function distinctionLabel(lang: Lang, type: DistinctionType): string {
  return distinctionLabels[lang][type];
}

export function categoryText(lang: Lang, category: string): string {
  return categoryLabels[lang][category] ?? category;
}

export function distinctionBadgeTitle(lang: Lang): string {
  return lang === "es"
    ? "insignia propia de FoodMaps, no el logo oficial"
    : "FoodMaps' own badge, not the official logo";
}
