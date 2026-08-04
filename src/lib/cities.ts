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
import copenhague from "@/data/cities/copenhague.json";
import roma from "@/data/cities/roma.json";
import milan from "@/data/cities/milan.json";
import florencia from "@/data/cities/florencia.json";
import napoles from "@/data/cities/napoles.json";
import estambul from "@/data/cities/estambul.json";
import atenas from "@/data/cities/atenas.json";
import budapest from "@/data/cities/budapest.json";
import berlin from "@/data/cities/berlin.json";
import amsterdam from "@/data/cities/amsterdam.json";
import osaka from "@/data/cities/osaka.json";
import kioto from "@/data/cities/kioto.json";
import beijing from "@/data/cities/beijing.json";
import shanghai from "@/data/cities/shanghai.json";
import ciudadDelCabo from "@/data/cities/ciudad-del-cabo.json";
import londres from "@/data/cities/londres.json";
import lisboa from "@/data/cities/lisboa.json";

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
  copenhague: copenhague as CityData,
  roma: roma as CityData,
  milan: milan as CityData,
  florencia: florencia as CityData,
  napoles: napoles as CityData,
  estambul: estambul as CityData,
  atenas: atenas as CityData,
  budapest: budapest as CityData,
  berlin: berlin as CityData,
  amsterdam: amsterdam as CityData,
  osaka: osaka as CityData,
  kioto: kioto as CityData,
  beijing: beijing as CityData,
  shanghai: shanghai as CityData,
  "ciudad-del-cabo": ciudadDelCabo as CityData,
  londres: londres as CityData,
  lisboa: lisboa as CityData,
};

export function getCityData(slug: string): CityData | null {
  return cityData[slug] ?? null;
}

export function getAvailableCitySlugs(): string[] {
  return Object.keys(cityData);
}
