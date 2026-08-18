import type { Lang } from "@/types/city";

export const dictionary = {
  es: {
    nav: {
      tagline: "Top lugares por ciudad · mapa completo aparte",
    },
    footer: {
      text: "Cada lugar fue verificado antes de sumarse a la lista. Cuando existe una fuente real — Time Out, un influencer, TV, un crítico o Anthony Bourdain — va linkeada. Si no, se incluye igual pero sin inventar nada.",
    },
    home: {
      kicker: "100 ciudades · en construcción",
      titleStart: "El mapa gastronómico del mundo, ",
      titleHighlight: "curado",
      titleEnd: " lugar por lugar.",
      lead: "Nada de listas genéricas. Por cada ciudad investigamos entre 40 y 100 lugares con respaldo real — Time Out, críticos, Bourdain, Michelin — filtrables por categoría y cocina, con el mapa completo a un clic de distancia.",
      marquee: "Fuentes reales · sin inventar nada · ",
      citiesHeading: "Ciudades",
      listsCount: (available: number, total: number) =>
        `${available} / ${total} listas`,
      comingSoon: "Próximamente",
      top5Check: "Ver ✓",
      searchPlaceholder: "Buscar ciudad o país…",
      searchNoResults: "Ninguna ciudad coincide con esa búsqueda.",
      continentCount: (n: number) => `${n} ${n === 1 ? "ciudad" : "ciudades"}`,
      continents: {
        north_america: "Norteamérica",
        latin_america: "Latinoamérica",
        europe: "Europa",
        middle_east: "Medio Oriente",
        africa: "África",
        asia: "Asia",
        oceania: "Oceanía",
      },
    },
    city: {
      backLink: "Todas las ciudades",
      placesInvestigated: (n: number) => `${n} lugares investigados`,
      placesProgress: (n: number, target: number) =>
        `${n} de ${target} lugares`,
      topHeading: (n: number) => `Top ${n}`,
      topSubheading:
        "Elegidos a mano por fama, respaldo mediático y cool factor — mezclando clásicos, virales y alta cocina.",
      marquee: (n: number, cityName: string, total: number) =>
        `${n} lugares en ${cityName} · ${total} investigados · `,
      fullListHeading: (total: number) => `¿Los ${total} lugares completos?`,
      fullListBody:
        "Viven en un mapa curado de Google My Maps — pines, categorías y descripciones, listo para guardar.",
      viewFullMap: "Ver mapa completo",
      tabs: {
        novedades: "Novedades",
        top: "Top",
        categorias: "Categorías",
        cocinas: "Cocinas",
        especiales: "Especiales",
      },
      allChip: "Todas",
      noResultsForFilter: "Todavía no hay lugares en este filtro.",
      noNews: "Todavía no hay novedades para esta ciudad.",
      newsFooterNote: "Se actualiza periódicamente con lo último de cada ciudad.",
    },
    place: {
      viewOnMaps: "Ver en Google Maps",
      source: "Fuente",
    },
    notFound: {
      title: "404",
      body: "Esa ciudad todavía no está en el mapa. Volvé al inicio para ver las que ya tienen datos.",
      backHome: "Volver al inicio",
    },
    langSwitch: {
      label: "EN",
      full: "English",
    },
  },
  en: {
    nav: {
      tagline: "Top spots per city · full map on the side",
    },
    footer: {
      text: "Every place was verified before it made the list. When a real source exists — Time Out, an influencer, TV, a critic, or Anthony Bourdain — it's linked. If not, it's still included, but nothing is made up.",
    },
    home: {
      kicker: "100 cities · in progress",
      titleStart: "The world's food map, ",
      titleHighlight: "curated",
      titleEnd: " place by place.",
      lead: "No generic lists. For every city we research 40 to 100 places with real backing — Time Out, critics, Bourdain, Michelin — filterable by category and cuisine, with the full map a click away.",
      marquee: "Real sources · nothing made up · ",
      citiesHeading: "Cities",
      listsCount: (available: number, total: number) =>
        `${available} / ${total} lists`,
      comingSoon: "Coming soon",
      top5Check: "View ✓",
      searchPlaceholder: "Search city or country…",
      searchNoResults: "No city matches that search.",
      continentCount: (n: number) => `${n} ${n === 1 ? "city" : "cities"}`,
      continents: {
        north_america: "North America",
        latin_america: "Latin America",
        europe: "Europe",
        middle_east: "Middle East",
        africa: "Africa",
        asia: "Asia",
        oceania: "Oceania",
      },
    },
    city: {
      backLink: "All cities",
      placesInvestigated: (n: number) => `${n} places researched`,
      placesProgress: (n: number, target: number) =>
        `${n} of ${target} places`,
      topHeading: (n: number) => `Top ${n}`,
      topSubheading:
        "Hand-picked for fame, media backing, and cool factor — mixing classics, virals, and fine dining.",
      marquee: (n: number, cityName: string, total: number) =>
        `${n} places in ${cityName} · ${total} researched · `,
      fullListHeading: (total: number) => `All ${total} places?`,
      fullListBody:
        "They live on a curated Google My Maps map — pins, categories, and descriptions, ready to save.",
      viewFullMap: "View full map",
      tabs: {
        novedades: "News",
        top: "Top",
        categorias: "Categories",
        cocinas: "Cuisines",
        especiales: "Specials",
      },
      allChip: "All",
      noResultsForFilter: "No places in this filter yet.",
      noNews: "No news for this city yet.",
      newsFooterNote: "Updated periodically with what's new in each city.",
    },
    place: {
      viewOnMaps: "View on Google Maps",
      source: "Source",
    },
    notFound: {
      title: "404",
      body: "That city isn't on the map yet. Head back home to see the ones that already have data.",
      backHome: "Back home",
    },
    langSwitch: {
      label: "ES",
      full: "Español",
    },
  },
} as const satisfies Record<Lang, unknown>;

export function t(lang: Lang) {
  return dictionary[lang];
}
