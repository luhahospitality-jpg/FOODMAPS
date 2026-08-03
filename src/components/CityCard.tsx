import Link from "next/link";
import type { CityIndexEntry } from "@/types/city";
import { Pill } from "./Pill";

const palette = ["bg-mustard", "bg-pink", "bg-blue", "bg-red"] as const;

export function CityCard({
  city,
  index,
}: {
  city: CityIndexEntry;
  index: number;
}) {
  const color = palette[index % palette.length];
  const textOnColor = color === "bg-blue" || color === "bg-red" ? "text-paper" : "text-ink";

  if (!city.available) {
    return (
      <div className="flex flex-col justify-between rounded-2xl border-2 border-ink/30 border-dashed bg-paper/40 p-5 opacity-70">
        <div>
          <p className="font-display text-2xl leading-none font-black uppercase">
            {city.name}
          </p>
          <p className="mt-1 font-label text-xs text-ink/60 uppercase">
            {city.country}
          </p>
        </div>
        <div className="mt-6">
          <Pill variant="paper" className="border-ink/30 text-ink/50">
            Próximamente
          </Pill>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={`/ciudad/${city.slug}`}
      className={`group flex flex-col justify-between rounded-2xl border-2 border-ink ${color} ${textOnColor} p-5 shadow-hard transition-transform hover:-translate-y-1 hover:shadow-hard-sm`}
    >
      <div>
        <p className="font-display text-2xl leading-none font-black uppercase sm:text-3xl">
          {city.name}
        </p>
        <p className="mt-1 font-label text-xs opacity-70 uppercase">
          {city.country}
        </p>
      </div>
      <div className="mt-6 flex items-center justify-between">
        <Pill variant={textOnColor === "text-paper" ? "paper" : "ink"}>
          Top 5 ✓
        </Pill>
        <span className="font-display text-lg font-black transition-transform group-hover:translate-x-1">
          →
        </span>
      </div>
    </Link>
  );
}
