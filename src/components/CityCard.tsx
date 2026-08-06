import Link from "next/link";
import type { CityIndexEntry, Lang } from "@/types/city";
import { Pill } from "./Pill";
import { t } from "@/lib/dictionary";

const palette = ["bg-mustard", "bg-pink", "bg-blue", "bg-red"] as const;

export function CityCard({
  city,
  index,
  lang = "es",
}: {
  city: CityIndexEntry;
  index: number;
  lang?: Lang;
}) {
  const dict = t(lang);
  const color = palette[index % palette.length];
  const textOnColor = color === "bg-blue" || color === "bg-red" ? "text-paper" : "text-ink";
  const href = lang === "es" ? `/ciudad/${city.slug}` : `/en/city/${city.slug}`;
  const name = lang === "en" ? (city.name_en ?? city.name) : city.name;
  const country = lang === "en" ? (city.country_en ?? city.country) : city.country;

  if (!city.available) {
    return (
      <div className="flex flex-col justify-between rounded-2xl border-2 border-ink/30 border-dashed bg-paper/40 p-5 opacity-70">
        <div>
          <p className="font-display text-2xl leading-none font-black uppercase">
            {name}
          </p>
          <p className="mt-1 font-label text-xs text-ink/60 uppercase">
            {country}
          </p>
        </div>
        <div className="mt-6">
          <Pill variant="paper" className="border-ink/30 text-ink/50">
            {dict.home.comingSoon}
          </Pill>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`group flex flex-col justify-between rounded-2xl border-2 border-ink ${color} ${textOnColor} p-5 shadow-hard transition-transform hover:-translate-y-1 hover:shadow-hard-sm`}
    >
      <div>
        <p className="font-display text-2xl leading-none font-black uppercase sm:text-3xl">
          {name}
        </p>
        <p className="mt-1 font-label text-xs opacity-70 uppercase">
          {country}
        </p>
      </div>
      <div className="mt-6 flex items-center justify-between">
        <Pill variant={textOnColor === "text-paper" ? "paper" : "ink"}>
          {dict.home.top5Check}
        </Pill>
        <span className="font-display text-lg font-black transition-transform group-hover:translate-x-1">
          →
        </span>
      </div>
    </Link>
  );
}
