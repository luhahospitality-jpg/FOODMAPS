export type SourceType =
  | "timeout"
  | "influencer"
  | "tv_show"
  | "viral_social"
  | "classic"
  | "bourdain"
  | "critic"
  | null;

export type DistinctionType =
  | "michelin_star"
  | "michelin_bib_gourmand"
  | "repsol_sol";

export interface Distinction {
  type: DistinctionType;
  count: number | null;
}

export interface Place {
  name: string;
  place_id: string | null;
  lat: number;
  lng: number;
  category: string;
  cuisine: string | null;
  tags: string[];
  description: string;
  source_url: string | null;
  source_type: SourceType;
  source_type_secondary?: SourceType;
  rank: number;
  reservable: boolean | null;
  google_maps_url: string | null;
  distinction?: Distinction | null;
}

export type Tier = "S" | "M" | "N";

export interface CityData {
  slug: string;
  name: string;
  country: string;
  tagline: string;
  totalPlaces: number;
  targetPlaces: number;
  tier: Tier;
  mymaps_url: string | null;
  places: Place[];
}

export type Continent =
  | "north_america"
  | "latin_america"
  | "europe"
  | "middle_east"
  | "africa"
  | "asia"
  | "oceania";

export interface CityIndexEntry {
  slug: string;
  name: string;
  country: string;
  name_en?: string;
  country_en?: string;
  continent: Continent;
  tier: Tier;
  plannedPlaces: number;
  available: boolean;
}

export type Lang = "es" | "en";

export interface PlaceTranslation {
  description?: string;
  cuisine?: string | null;
}

export interface CityTranslation {
  name?: string;
  country?: string;
  tagline?: string;
  places?: Record<string, PlaceTranslation>;
}

export interface NewsItem {
  titulo: string;
  resumen: string;
  fuente_url: string | null;
  imagen_url?: string | null;
  fecha: string;
  ciudad_slug: string;
}
