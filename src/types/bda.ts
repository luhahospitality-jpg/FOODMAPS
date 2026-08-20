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
  | "Argentina"
  | "Uruguay"
  | "Estados Unidos"
  | "México";

export type Project = {
  slug: string;
  name: string;
  brandSlug: string;
  city: string;
  region: ProjectRegion;
  lat: number;
  lng: number;
  developer?: string;
  status: string;
  units?: string;
  credits?: string;
  description: string;
  bdaRole?: string;
};
