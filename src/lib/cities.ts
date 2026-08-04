import type { CityData } from "@/types/city";
import newYork from "@/data/cities/new-york.json";
import madrid from "@/data/cities/madrid.json";
import barcelona from "@/data/cities/barcelona.json";
import bilbao from "@/data/cities/bilbao.json";
import sanSebastian from "@/data/cities/san-sebastian.json";
import malaga from "@/data/cities/malaga.json";
import losAngeles from "@/data/cities/los-angeles.json";

const cityData: Record<string, CityData> = {
  "nueva-york": newYork as CityData,
  madrid: madrid as CityData,
  barcelona: barcelona as CityData,
  bilbao: bilbao as CityData,
  "san-sebastian": sanSebastian as CityData,
  malaga: malaga as CityData,
  "los-angeles": losAngeles as CityData,
};

export function getCityData(slug: string): CityData | null {
  return cityData[slug] ?? null;
}

export function getAvailableCitySlugs(): string[] {
  return Object.keys(cityData);
}
