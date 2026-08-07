import type { Lang } from "@/types/city";

export const dictionary = {
  es: {
    nav: {
      tagline: "Top 5 por ciudad · mapa completo aparte",
    },
    footer: {
      text: "Cada lugar fue verificado antes de sumarse a la lista. Cuando existe una fuente real — Time Out, un influencer, TV o un viral — va linkeada. Si no, se incluye igual pero sin inventar nada.",
    },
    home: {
      kicker: "50 ciudades · en construcción",
      titleStart: "El mapa gastronómico del mundo, ",
      titleHighlight: "curado",
      titleEnd: " lugar por lugar.",
      lead: "Nada de listas genéricas. Por cada ciudad elegimos un Top 5 con respaldo real — Time Out, influencers, TV o virales de redes — y dejamos el mapa completo a un clic de distancia en Google My Maps.",
      marquee: "Top 5 curado · fuentes reales · sin inventar nada · ",
      citiesHeading: "Ciudades",
      listsCount: (available: number, total: number) =>
        `${available} / ${total} listas`,
      comingSoon: "Próximamente",
      top5Check: "Top 5 ✓",
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
      backLink: "← Todas las ciudades",
      placesInvestigated: (n: number) => `${n} lugares investigados`,
      topHeading: (n: number) => `Top ${n}`,
      topSubheading:
        "Elegidos a mano por fama, respaldo mediático y cool factor — mezclando clásicos, virales y alta cocina.",
      marquee: (n: number, cityName: string, total: number) =>
        `Top ${n} de ${cityName} · ${total} lugares investigados · `,
      fullListHeading: (total: number) => `¿Los ${total} lugares completos?`,
      fullListBody:
        "Viven en un mapa curado de Google My Maps — pines, categorías y descripciones, listo para guardar.",
      viewFullMap: "Ver mapa completo",
    },
    place: {
      viewOnMaps: "Ver en Google Maps",
      source: "Fuente",
    },
    notFound: {
      title: "404",
      body: "Esa ciudad todavía no está en el mapa. Volvé al inicio para ver las que ya tienen Top 5.",
      backHome: "Volver al inicio",
    },
    langSwitch: {
      label: "EN",
      full: "English",
    },
  },
  en: {
    nav: {
      tagline: "Top 5 per city · full map on the side",
    },
    footer: {
      text: "Every place was verified before it made the list. When a real source exists — Time Out, an influencer, TV, or a viral post — it's linked. If not, it's still included, but nothing is made up.",
    },
    home: {
      kicker: "50 cities · in progress",
      titleStart: "The world's food map, ",
      titleHighlight: "curated",
      titleEnd: " place by place.",
      lead: "No generic lists. For every city we pick a Top 5 with real backing — Time Out, influencers, TV, or social virals — and leave the full map a click away on Google My Maps.",
      marquee: "Curated Top 5 · real sources · nothing made up · ",
      citiesHeading: "Cities",
      listsCount: (available: number, total: number) =>
        `${available} / ${total} lists`,
      comingSoon: "Coming soon",
      top5Check: "Top 5 ✓",
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
      backLink: "← All cities",
      placesInvestigated: (n: number) => `${n} places researched`,
      topHeading: (n: number) => `Top ${n}`,
      topSubheading:
        "Hand-picked for fame, media backing, and cool factor — mixing classics, virals, and fine dining.",
      marquee: (n: number, cityName: string, total: number) =>
        `Top ${n} in ${cityName} · ${total} places researched · `,
      fullListHeading: (total: number) => `All ${total} places?`,
      fullListBody:
        "They live on a curated Google My Maps map — pins, categories, and descriptions, ready to save.",
      viewFullMap: "View full map",
    },
    place: {
      viewOnMaps: "View on Google Maps",
      source: "Source",
    },
    notFound: {
      title: "404",
      body: "That city isn't on the map yet. Head back home to see the ones that already have a Top 5.",
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
