import fs from "node:fs";
import path from "node:path";
import type { FeaturedVideo } from "@/types/city";

const videosDir = path.join(process.cwd(), "src/data/videos");

export function getFeaturedVideo(slug: string): FeaturedVideo | null {
  const filePath = path.join(videosDir, `${slug}.json`);
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as FeaturedVideo;
  } catch {
    return null;
  }
}
