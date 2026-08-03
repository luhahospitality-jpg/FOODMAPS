import type { Place } from "@/types/city";
import { Pill } from "./Pill";
import { DistinctionBadge } from "./DistinctionBadge";
import { categoryText, sourceTypeLabel } from "@/lib/labels";

const rankColors = ["bg-mustard", "bg-pink", "bg-blue", "bg-red", "bg-ink"] as const;

export function PlaceCard({ place }: { place: Place }) {
  const rankIndex = (place.top5_rank ?? 1) - 1;
  const rankColor = rankColors[rankIndex % rankColors.length];
  const rankTextColor =
    rankColor === "bg-blue" || rankColor === "bg-red" || rankColor === "bg-ink"
      ? "text-paper"
      : "text-ink";

  return (
    <article className="flex flex-col gap-4 rounded-2xl border-2 border-ink bg-paper p-6 shadow-hard">
      <div className="flex items-start justify-between gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-ink font-display text-xl font-black ${rankColor} ${rankTextColor}`}
        >
          {String(place.top5_rank ?? 0).padStart(2, "0")}
        </span>
        {place.source_type && (
          <Pill variant="ink">{sourceTypeLabel[place.source_type]}</Pill>
        )}
      </div>

      <div>
        <h3 className="font-display text-2xl leading-tight font-black uppercase sm:text-3xl">
          {place.name}
        </h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Pill variant="mustard">{categoryText(place.category)}</Pill>
          {place.cuisine && <Pill variant="pink">{place.cuisine}</Pill>}
          {place.distinction && (
            <DistinctionBadge distinction={place.distinction} />
          )}
        </div>
      </div>

      <p className="font-body text-sm leading-relaxed text-ink/80">
        {place.description}
      </p>

      <div className="mt-auto flex flex-wrap items-center gap-3 pt-2">
        {place.google_maps_url && (
          <a
            href={place.google_maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-ink px-4 py-2 font-label text-xs font-bold tracking-wide text-paper uppercase transition-colors hover:bg-blue"
          >
            Ver en Google Maps
            <span aria-hidden="true">↗</span>
          </a>
        )}
        {place.source_url && (
          <a
            href={place.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-label text-xs font-bold text-ink/70 uppercase underline decoration-2 underline-offset-4 hover:text-red"
          >
            Fuente
            <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>
    </article>
  );
}
