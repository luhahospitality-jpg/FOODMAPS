"use client";

import { useMemo, useState } from "react";
import type { CityIndexEntry, Continent, Lang } from "@/types/city";
import { CityCard } from "@/components/CityCard";
import { ContinentIcon } from "@/components/ContinentIcon";
import { t } from "@/lib/dictionary";

const continentOrder: Continent[] = [
  "north_america",
  "latin_america",
  "europe",
  "middle_east",
  "africa",
  "asia",
  "oceania",
];

const badgeColors = ["bg-mustard", "bg-pink", "bg-blue", "bg-red"] as const;

export function CityBrowser({
  cities,
  lang,
}: {
  cities: CityIndexEntry[];
  lang: Lang;
}) {
  const dict = t(lang);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<Continent>>(new Set());

  const normalizedQuery = query.trim().toLowerCase();
  const isSearching = normalizedQuery.length > 0;

  function toggleContinent(continent: Continent) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(continent)) next.delete(continent);
      else next.add(continent);
      return next;
    });
  }

  const matches = (city: CityIndexEntry) => {
    if (!isSearching) return true;
    const name = lang === "en" ? (city.name_en ?? city.name) : city.name;
    const country = lang === "en" ? (city.country_en ?? city.country) : city.country;
    return (
      name.toLowerCase().includes(normalizedQuery) ||
      country.toLowerCase().includes(normalizedQuery)
    );
  };

  const groups = useMemo(() => {
    return continentOrder
      .map((continent, i) => ({
        continent,
        color: badgeColors[i % badgeColors.length],
        cities: cities.filter((c) => c.continent === continent && matches(c)),
      }))
      .filter((group) => group.cities.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cities, normalizedQuery, lang]);

  let cardIndex = 0;

  return (
    <div>
      <div className="relative mb-8 max-w-sm">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink/40"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle
              cx="11"
              cy="11"
              r="7"
              stroke="currentColor"
              strokeWidth="2.2"
            />
            <path
              d="M20 20l-4.5-4.5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={dict.home.searchPlaceholder}
          className="w-full rounded-full border-2 border-ink bg-paper py-3 pr-4 pl-11 font-body text-sm text-ink placeholder:text-ink/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-mustard"
        />
      </div>

      {groups.length === 0 ? (
        <p className="font-body text-sm text-ink/60">
          {dict.home.searchNoResults}
        </p>
      ) : (
        groups.map((group) => {
          const isOpen = isSearching || !collapsed.has(group.continent);
          const textOnColor =
            group.color === "bg-blue" || group.color === "bg-red"
              ? "text-paper"
              : "text-ink";

          return (
            <div key={group.continent} className="mt-6 first:mt-0">
              <button
                type="button"
                onClick={() => toggleContinent(group.continent)}
                aria-expanded={isOpen}
                disabled={isSearching}
                className="flex w-full items-center gap-3 border-b-2 border-ink/15 py-3 text-left transition-colors hover:border-ink/40 disabled:cursor-default"
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-ink ${group.color} ${textOnColor}`}
                >
                  <ContinentIcon continent={group.continent} size={16} />
                </span>
                <span className="font-label text-xs font-bold tracking-[0.25em] text-ink/70 uppercase">
                  {dict.home.continents[group.continent]}
                </span>
                <span className="font-label text-[11px] font-bold text-ink/40 uppercase">
                  {dict.home.continentCount(group.cities.length)}
                </span>
                {!isSearching && (
                  <span
                    aria-hidden="true"
                    className={`ml-auto font-display text-lg font-black text-ink/50 transition-transform ${
                      isOpen ? "rotate-0" : "-rotate-90"
                    }`}
                  >
                    ▾
                  </span>
                )}
              </button>

              {isOpen && (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.cities.map((city) => (
                    <CityCard
                      key={city.slug}
                      city={city}
                      index={cardIndex++}
                      lang={lang}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
