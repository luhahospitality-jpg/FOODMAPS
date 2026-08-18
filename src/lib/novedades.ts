import fs from "node:fs";
import path from "node:path";
import type { NewsItem } from "@/types/city";

const novedadesDir = path.join(process.cwd(), "src/data/novedades");

export function getNews(slug: string): NewsItem[] {
  const filePath = path.join(novedadesDir, `${slug}.json`);
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as NewsItem[];
  } catch {
    return [];
  }
}
