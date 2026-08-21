export type BrandCategory = "moda" | "servicios" | "lifestyle";

export type Brand = {
  slug: string;
  name: string;
  category: BrandCategory;
  origin: string;
  description: string;
};

export type ProjectRegion =
  | "España"
  | "Portugal"
  | "Reino Unido"
  | "Francia"
  | "Italia"
  | "Grecia"
  | "Emiratos Árabes Unidos"
  | "Catar"
  | "Arabia Saudita"
  | "Turcas y Caicos"
  | "Japón"
  | "Tailandia"
  | "Singapur"
  | "Estados Unidos"
  | "México"
  | "Argentina"
  | "Uruguay";

export type Project = {
  slug: string;
  name: string;
  brandSlug: string;
  city: string;
  region: ProjectRegion;
  lat: number;
  lng: number;
  developer?: string;
  status?: string;
  units?: string;
  credits?: string;
  description: string;
};
