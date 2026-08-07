import type { NewsItem } from "@/types/city";
import novedadesData from "@/data/novedades.json";

const novedades = novedadesData as Record<string, NewsItem[]>;

export function getNews(slug: string): NewsItem[] {
  return novedades[slug] ?? [];
}
