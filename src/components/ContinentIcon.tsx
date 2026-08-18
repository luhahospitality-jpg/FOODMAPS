import type { Continent } from "@/types/city";

const dotPosition: Record<Continent, { x: number; y: number }> = {
  north_america: { x: 6, y: 8 },
  latin_america: { x: 7, y: 15.5 },
  europe: { x: 12, y: 6 },
  middle_east: { x: 14.5, y: 10 },
  africa: { x: 12.5, y: 14.5 },
  asia: { x: 17, y: 8 },
  oceania: { x: 18, y: 17 },
};

export function ContinentIcon({
  continent,
  size = 18,
  className = "",
}: {
  continent: Continent;
  size?: number;
  className?: string;
}) {
  const dot = dotPosition[continent];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <ellipse
        cx="12"
        cy="12"
        rx="4"
        ry="9"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.5"
      />
      <path
        d="M3 12h18"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.5"
      />
      <circle cx={dot.x} cy={dot.y} r="2.4" fill="currentColor" />
    </svg>
  );
}
