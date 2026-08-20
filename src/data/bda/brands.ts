import type { Brand } from "@/types/bda";

export const brands: Brand[] = [
  // — Moda y maisons de lujo —
  {
    slug: "dolce-gabbana",
    name: "Dolce & Gabbana",
    category: "moda",
    origin: "Italia",
    description:
      "Maison de moda milanesa que extiende su lenguaje estético — barroco, mediterráneo, artesanal — al residencial de lujo.",
  },
  {
    slug: "karl-lagerfeld",
    name: "Karl Lagerfeld",
    category: "moda",
    origin: "Alemania / Francia",
    description:
      "La casa fundada por el diseñador licencia villas firmadas con su estética arquitectónica en blanco y negro.",
  },
  {
    slug: "fendi",
    name: "Fendi",
    category: "moda",
    origin: "Italia",
    description:
      "A través de Fendi Casa, la maison romana traslada su artesanía textil y de interiores al desarrollo residencial.",
  },
  {
    slug: "versace",
    name: "Versace",
    category: "moda",
    origin: "Italia",
    description:
      "La casa italiana presta su identidad visual — dorada, escultórica, inconfundible — a residencias de autor.",
  },
  {
    slug: "bulgari",
    name: "Bulgari",
    category: "moda",
    origin: "Italia",
    description:
      "La maison de joyería romana opera un número reducido de residencias de altísimo standing junto a sus hoteles homónimos.",
  },
  {
    slug: "missoni",
    name: "Missoni",
    category: "moda",
    origin: "Italia",
    description:
      "La firma textil conocida por sus tejidos de punto multicolor licencia colecciones residenciales con esa misma identidad.",
  },
  {
    slug: "baccarat",
    name: "Baccarat",
    category: "moda",
    origin: "Francia",
    description:
      "La manufactura de cristal fundada en 1764 presta su nombre a residencias con un lenguaje decorativo propio.",
  },

  // — Operadores hoteleros y de hospitality —
  {
    slug: "sls",
    name: "SLS",
    category: "servicios",
    origin: "Estados Unidos",
    description:
      "Marca hotelera lifestyle nacida en Los Ángeles, referente en residencias urbanas de diseño contemporáneo.",
  },
  {
    slug: "banyan-tree",
    name: "Banyan Tree",
    category: "servicios",
    origin: "Singapur",
    description:
      "Grupo hotelero asiático especializado en bienestar y spa, hoy también presente en residencias urbanas europeas.",
  },
  {
    slug: "four-seasons",
    name: "Four Seasons",
    category: "servicios",
    origin: "Canadá",
    description:
      "Uno de los operadores hoteleros de mayor prestigio global, con un porfolio extenso de residencias gestionadas.",
  },
  {
    slug: "st-regis",
    name: "St. Regis",
    category: "servicios",
    origin: "Estados Unidos",
    description:
      "Marca insignia de lujo de Marriott, asociada al servicio de mayordomía y a proyectos residenciales de gran escala.",
  },
  {
    slug: "w-hotels",
    name: "W Hotels",
    category: "servicios",
    origin: "Estados Unidos",
    description:
      "Marca lifestyle de Marriott orientada a un público urbano y contemporáneo, con residencias de diseño arriesgado.",
  },
  {
    slug: "ritz-carlton",
    name: "Ritz-Carlton",
    category: "servicios",
    origin: "Estados Unidos",
    description:
      "Referente histórico del servicio hotelero de lujo, con residencias asociadas a sus enclaves más exclusivos.",
  },
  {
    slug: "waldorf-astoria",
    name: "Waldorf Astoria",
    category: "servicios",
    origin: "Estados Unidos",
    description:
      "Marca de lujo histórica de Hilton, sinónimo de servicio hotelero clásico trasladado al residencial.",
  },
  {
    slug: "mandarin-oriental",
    name: "Mandarin Oriental",
    category: "servicios",
    origin: "Hong Kong",
    description:
      "Grupo hotelero de origen asiático reconocido por su nivel de servicio, con residencias en capitales internacionales.",
  },
  {
    slug: "sofitel",
    name: "Sofitel",
    category: "servicios",
    origin: "Francia",
    description:
      "Marca francesa de lujo de Accor, con residencias que combinan savoir-faire galo y arquitectura contemporánea.",
  },
  {
    slug: "hyatt",
    name: "Hyatt",
    category: "servicios",
    origin: "Estados Unidos",
    description:
      "Grupo hotelero estadounidense con distintas líneas — Park Hyatt, Hyatt Regency — presentes en el residencial de lujo.",
  },
  {
    slug: "aman",
    name: "Aman",
    category: "servicios",
    origin: "Suiza / Indonesia",
    description:
      "Operador de resorts ultra-exclusivos, célebre por su discreción y sus emplazamientos remotos, con demanda residencial creciente.",
  },
  {
    slug: "six-senses",
    name: "Six Senses",
    category: "servicios",
    origin: "Tailandia",
    description:
      "Marca de resorts de bienestar y sostenibilidad, con residencias integradas en entornos naturales protegidos.",
  },
  {
    slug: "marriott",
    name: "Marriott / Westin",
    category: "servicios",
    origin: "Estados Unidos",
    description:
      "El mayor grupo hotelero del mundo, con líneas como Westin presentes en desarrollos residenciales de resort.",
  },
  {
    slug: "cipriani",
    name: "Cipriani",
    category: "servicios",
    origin: "Italia",
    description:
      "Grupo de hospitalidad de origen veneciano, con residencias diseñadas por firmas de arquitectura de primer nivel.",
  },
  {
    slug: "nobu",
    name: "Nobu",
    category: "servicios",
    origin: "Estados Unidos / Japón",
    description:
      "La marca de hospitalidad nacida del restaurante homónimo, con residencias asociadas a sus hoteles boutique.",
  },
  {
    slug: "alvear",
    name: "Alvear",
    category: "servicios",
    origin: "Argentina",
    description:
      "Grupo hotelero argentino de referencia en el segmento de ultra lujo, con más de un siglo de trayectoria en Buenos Aires.",
  },

  // — Automoción y marcas de estilo de vida —
  {
    slug: "lamborghini",
    name: "Automobili Lamborghini",
    category: "lifestyle",
    origin: "Italia",
    description:
      "El fabricante de automóviles deportivos traslada su lenguaje de diseño y rendimiento a villas de autor.",
  },
  {
    slug: "bentley",
    name: "Bentley",
    category: "lifestyle",
    origin: "Reino Unido",
    description:
      "La marca británica de automóviles de lujo firmó su primer edificio residencial del mundo en Miami.",
  },
  {
    slug: "aston-martin",
    name: "Aston Martin",
    category: "lifestyle",
    origin: "Reino Unido",
    description:
      "El fabricante británico de deportivos de lujo presta su identidad de diseño a una torre residencial en Miami.",
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
  moda: "Maisons de moda y casas de lujo que extienden su identidad al residencial.",
  servicios:
    "Operadores hoteleros que aportan el estándar de servicio que define a la categoría.",
  lifestyle:
    "Marcas de automoción y estilo de vida que trasladan su diseño a la vivienda.",
};
