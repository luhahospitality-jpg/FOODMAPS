import type { CityData } from "@/types/city";
import newYork from "@/data/cities/new-york.json";

const cityData: Record<string, CityData> = {
  "nueva-york": newYork as CityData,
};

export function getCityData(slug: string): CityData | null {
  return cityData[slug] ?? null;
}

export function getAvailableCitySlugs(): string[] {
  return Object.keys(cityData);
}
