import type { Brand } from "@/types/bda";

export const brands: Brand[] = [
  // — Moda —
  {
    slug: "armani",
    name: "Armani",
    category: "moda",
    origin: "Italia",
    description: "El minimalismo Armani, aplicado a la vivienda.",
  },
  {
    slug: "dolce-gabbana",
    name: "Dolce & Gabbana",
    category: "moda",
    origin: "Italia",
    description: "Barroco mediterráneo, hecho residencia.",
  },
  {
    slug: "karl-lagerfeld",
    name: "Karl Lagerfeld",
    category: "moda",
    origin: "Alemania / Francia",
    description: "Villas firmadas en blanco y negro.",
  },
  {
    slug: "fendi",
    name: "Fendi",
    category: "moda",
    origin: "Italia",
    description: "La artesanía romana de Fendi Casa, en interiores.",
  },
  {
    slug: "versace",
    name: "Versace",
    category: "moda",
    origin: "Italia",
    description: "Dorado, escultórico, inconfundible.",
  },
  {
    slug: "bulgari",
    name: "Bulgari",
    category: "moda",
    origin: "Italia",
    description: "Joyería romana convertida en dirección.",
  },
  {
    slug: "missoni",
    name: "Missoni",
    category: "moda",
    origin: "Italia",
    description: "El punto multicolor, en arquitectura.",
  },
  {
    slug: "baccarat",
    name: "Baccarat",
    category: "moda",
    origin: "Francia",
    description: "Cristal francés desde 1764.",
  },

  // — Servicios —
  {
    slug: "aman",
    name: "Aman",
    category: "servicios",
    origin: "Suiza / Indonesia",
    description: "Discreción y emplazamientos remotos.",
  },
  {
    slug: "four-seasons",
    name: "Four Seasons",
    category: "servicios",
    origin: "Canadá",
    description: "El estándar del servicio hotelero global.",
  },
  {
    slug: "ritz-carlton",
    name: "Ritz-Carlton",
    category: "servicios",
    origin: "Estados Unidos",
    description: "Ladies and gentlemen, desde 1983.",
  },
  {
    slug: "st-regis",
    name: "St. Regis",
    category: "servicios",
    origin: "Estados Unidos",
    description: "Mayordomía como firma de marca.",
  },
  {
    slug: "waldorf-astoria",
    name: "Waldorf Astoria",
    category: "servicios",
    origin: "Estados Unidos",
    description: "El lujo hotelero clásico de Hilton.",
  },
  {
    slug: "mandarin-oriental",
    name: "Mandarin Oriental",
    category: "servicios",
    origin: "Hong Kong",
    description: "Servicio asiático en capitales globales.",
  },
  {
    slug: "raffles",
    name: "Raffles",
    category: "servicios",
    origin: "Singapur",
    description: "Hospitalidad colonial reinventada.",
  },
  {
    slug: "rosewood",
    name: "Rosewood",
    category: "servicios",
    origin: "Estados Unidos",
    description: "'A Sense of Place', en cada ciudad.",
  },
  {
    slug: "banyan-tree",
    name: "Banyan Tree",
    category: "servicios",
    origin: "Singapur",
    description: "Bienestar y spa, origen asiático.",
  },
  {
    slug: "six-senses",
    name: "Six Senses",
    category: "servicios",
    origin: "Tailandia",
    description: "Sostenibilidad como estándar de lujo.",
  },
  {
    slug: "sls",
    name: "SLS",
    category: "servicios",
    origin: "Estados Unidos",
    description: "Lifestyle urbano nacido en Los Ángeles.",
  },
  {
    slug: "w-hotels",
    name: "W Hotels",
    category: "servicios",
    origin: "Estados Unidos",
    description: "Diseño arriesgado, energía urbana.",
  },
  {
    slug: "sofitel",
    name: "Sofitel",
    category: "servicios",
    origin: "Francia",
    description: "Savoir-faire francés, de Accor.",
  },
  {
    slug: "hyatt",
    name: "Hyatt",
    category: "servicios",
    origin: "Estados Unidos",
    description: "Park Hyatt y Hyatt Regency, en residencial.",
  },
  {
    slug: "marriott",
    name: "Marriott / Westin",
    category: "servicios",
    origin: "Estados Unidos",
    description: "El mayor grupo hotelero del mundo.",
  },
  {
    slug: "cipriani",
    name: "Cipriani",
    category: "servicios",
    origin: "Italia",
    description: "Hospitalidad de origen veneciano.",
  },
  {
    slug: "nobu",
    name: "Nobu",
    category: "servicios",
    origin: "Estados Unidos / Japón",
    description: "Del restaurante al hotel boutique.",
  },
  {
    slug: "alvear",
    name: "Alvear",
    category: "servicios",
    origin: "Argentina",
    description: "Ultra lujo porteño desde hace un siglo.",
  },

  // — Lifestyle —
  {
    slug: "bentley",
    name: "Bentley",
    category: "lifestyle",
    origin: "Reino Unido",
    description: "Su primer edificio residencial, en Miami.",
  },
  {
    slug: "aston-martin",
    name: "Aston Martin",
    category: "lifestyle",
    origin: "Reino Unido",
    description: "Diseño aerodinámico, vertical.",
  },
  {
    slug: "lamborghini",
    name: "Automobili Lamborghini",
    category: "lifestyle",
    origin: "Italia",
    description: "Rendimiento traducido a villas.",
  },
  {
    slug: "porsche-design",
    name: "Porsche Design",
    category: "lifestyle",
    origin: "Alemania",
    description: "Precisión alemana, en torre.",
  },
  {
    slug: "bugatti",
    name: "Bugatti",
    category: "lifestyle",
    origin: "Francia",
    description: "Sky mansions con ascensor para el coche.",
  },
  {
    slug: "mercedes-benz",
    name: "Mercedes-Benz",
    category: "lifestyle",
    origin: "Alemania",
    description: "Un distrito entero bajo la estrella.",
  },
];

export function getBrand(slug: string): Brand | undefined {
  return brands.find((b) => b.slug === slug);
}

export const categoryLabel: Record<Brand["category"], string> = {
  moda: "Moda",
  servicios: "Servicios",
  lifestyle: "Lifestyle",
};

export const categoryDescription: Record<Brand["category"], string> = {
  moda: "Maisons que extienden su identidad a la vivienda.",
  servicios: "Operadores hoteleros que definen el estándar.",
  lifestyle: "Automoción y diseño, en formato residencial.",
};
