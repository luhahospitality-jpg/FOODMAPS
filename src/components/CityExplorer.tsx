"use client";

import { useMemo, useState } from "react";
import type { Place, NewsItem, Lang, Tier } from "@/types/city";
import { PlaceCard } from "./PlaceCard";
import { categoryText, tagLabel } from "@/lib/labels";
import { t } from "@/lib/dictionary";

type Section = "novedades" | "top" | "categorias" | "cocinas" | "especiales";

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-full border-2 border-ink px-4 py-2 font-label text-xs font-bold tracking-wide uppercase transition-colors ${
        active ? "bg-ink text-paper" : "bg-paper text-ink hover:bg-mustard/30"
      }`}
    >
      {children}
    </button>
  );
}

export function CityExplorer({
  places,
  news,
  tier,
  lang,
}: {
  places: Place[];
  news: NewsItem[];
  tier: Tier;
  lang: Lang;
}) {
  const dict = t(lang);
  const [section, setSection] = useState<Section>("top");
  const [subFilter, setSubFilter] = useState<string | null>(null);

  const hasCocinasEspeciales = tier !== "N";

  const sortedByRank = useMemo(
    () => [...places].sort((a, b) => a.rank - b.rank),
    [places],
  );

  const categories = useMemo(
    () => Array.from(new Set(places.map((p) => p.category))).sort(),
    [places],
  );

  const cuisines = useMemo(() => {
    if (!hasCocinasEspeciales) return [];
    const set = new Set<string>();
    for (const p of places) {
      if (!p.cuisine) continue;
      for (const c of p.cuisine.split("/")) {
        const trimmed = c.trim();
        if (trimmed) set.add(trimmed);
      }
    }
    return Array.from(set).sort();
  }, [places, hasCocinasEspeciales]);

  const specialTags = useMemo(() => {
    if (!hasCocinasEspeciales) return [];
    const set = new Set<string>();
    for (const p of places) {
      for (const tag of p.tags) set.add(tag);
    }
    return Array.from(set).sort();
  }, [places, hasCocinasEspeciales]);

  function selectSection(next: Section) {
    setSection(next);
    if (next === "categorias") setSubFilter(categories[0] ?? null);
    else if (next === "cocinas") setSubFilter(cuisines[0] ?? null);
    else if (next === "especiales") setSubFilter(specialTags[0] ?? null);
    else setSubFilter(null);
  }

  const results = useMemo(() => {
    if (section === "top") return sortedByRank.slice(0, 20);
    if (section === "categorias" && subFilter) {
      return sortedByRank.filter((p) => p.category === subFilter).slice(0, 10);
    }
    if (section === "cocinas" && subFilter) {
      const needle = subFilter.toLowerCase();
      return sortedByRank
        .filter((p) => p.cuisine?.toLowerCase().includes(needle))
        .slice(0, 10);
    }
    if (section === "especiales" && subFilter) {
      return sortedByRank.filter((p) => p.tags.includes(subFilter)).slice(0, 10);
    }
    return [];
  }, [section, subFilter, sortedByRank]);

  const subOptions =
    section === "categorias"
      ? categories
      : section === "cocinas"
        ? cuisines
        : section === "especiales"
          ? specialTags
          : [];

  const subLabel = (value: string) =>
    section === "categorias"
      ? categoryText(lang, value)
      : section === "especiales"
        ? tagLabel(lang, value)
        : value;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Chip active={section === "novedades"} onClick={() => selectSection("novedades")}>
          {dict.city.tabs.novedades}
        </Chip>
        <Chip active={section === "top"} onClick={() => selectSection("top")}>
          {dict.city.tabs.top} {Math.min(20, places.length)}
        </Chip>
        <Chip active={section === "categorias"} onClick={() => selectSection("categorias")}>
          {dict.city.tabs.categorias}
        </Chip>
        {hasCocinasEspeciales && cuisines.length > 0 && (
          <Chip active={section === "cocinas"} onClick={() => selectSection("cocinas")}>
            {dict.city.tabs.cocinas}
          </Chip>
        )}
        {hasCocinasEspeciales && specialTags.length > 0 && (
          <Chip active={section === "especiales"} onClick={() => selectSection("especiales")}>
            {dict.city.tabs.especiales}
          </Chip>
        )}
      </div>

      {subOptions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {subOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSubFilter(option)}
              className={`inline-flex items-center rounded-full border-2 border-ink px-3 py-1 font-label text-[11px] font-bold tracking-wide uppercase transition-colors ${
                subFilter === option
                  ? "bg-mustard text-ink"
                  : "bg-paper text-ink/70 hover:bg-mustard/20"
              }`}
            >
              {subLabel(option)}
            </button>
          ))}
        </div>
      )}

      <div className="mt-8">
        {section === "novedades" ? (
          <NewsList news={news} lang={lang} />
        ) : results.length === 0 ? (
          <p className="font-body text-sm text-ink/60">
            {dict.city.noResultsForFilter}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((place) => (
              <PlaceCard key={place.name} place={place} lang={lang} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NewsList({ news, lang }: { news: NewsItem[]; lang: Lang }) {
  const dict = t(lang);

  if (news.length === 0) {
    return <p className="font-body text-sm text-ink/60">{dict.city.noNews}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {news.map((item, i) => (
        <article
          key={i}
          className="rounded-2xl border-2 border-ink bg-paper p-5 shadow-hard"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="font-label text-[11px] font-bold tracking-widest text-ink/50 uppercase">
              {item.fecha}
            </span>
          </div>
          <h3 className="mt-1 font-display text-xl font-black uppercase">
            {item.titulo}
          </h3>
          <p className="mt-2 font-body text-sm leading-relaxed text-ink/80">
            {item.resumen}
          </p>
          {item.fuente_url && (
            <a
              href={item.fuente_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 font-label text-xs font-bold text-ink/70 uppercase underline decoration-2 underline-offset-4 hover:text-red"
            >
              {dict.place.source}
              <span aria-hidden="true">↗</span>
            </a>
          )}
        </article>
      ))}
      <p className="font-label text-[11px] text-ink/40 uppercase">
        {dict.city.newsFooterNote}
      </p>
    </div>
  );
}
