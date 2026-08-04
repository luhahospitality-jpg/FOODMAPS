import type { CityData } from "@/types/city";
import newYork from "@/data/cities/new-york.json";
import madrid from "@/data/cities/madrid.json";
import barcelona from "@/data/cities/barcelona.json";
import bilbao from "@/data/cities/bilbao.json";
import sanSebastian from "@/data/cities/san-sebastian.json";
import malaga from "@/data/cities/malaga.json";
import losAngeles from "@/data/cities/los-angeles.json";
import tokio from "@/data/cities/tokio.json";
import buenosAires from "@/data/cities/buenos-aires.json";
import ciudadDeMexico from "@/data/cities/ciudad-de-mexico.json";
import cordoba from "@/data/cities/cordoba.json";
import saoPaulo from "@/data/cities/sao-paulo.json";
import rioDeJaneiro from "@/data/cities/rio-de-janeiro.json";
import lima from "@/data/cities/lima.json";
import bogota from "@/data/cities/bogota.json";
import oaxaca from "@/data/cities/oaxaca.json";
import valencia from "@/data/cities/valencia.json";
import espana from "@/data/cities/espana.json";
import paris from "@/data/cities/paris.json";

const cityData: Record<string, CityData> = {
  "nueva-york": newYork as CityData,
  madrid: madrid as CityData,
  barcelona: barcelona as CityData,
  bilbao: bilbao as CityData,
  "san-sebastian": sanSebastian as CityData,
  malaga: malaga as CityData,
  "los-angeles": losAngeles as CityData,
  tokio: tokio as CityData,
  "buenos-aires": buenosAires as CityData,
  "ciudad-de-mexico": ciudadDeMexico as CityData,
  cordoba: cordoba as CityData,
  "sao-paulo": saoPaulo as CityData,
  "rio-de-janeiro": rioDeJaneiro as CityData,
  lima: lima as CityData,
  bogota: bogota as CityData,
  oaxaca: oaxaca as CityData,
  valencia: valencia as CityData,
  espana: espana as CityData,
  paris: paris as CityData,
};

export function getCityData(slug: string): CityData | null {
  return cityData[slug] ?? null;
}

export function getAvailableCitySlugs(): string[] {
  return Object.keys(cityData);
}
