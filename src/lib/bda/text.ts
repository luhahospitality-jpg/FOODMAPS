const SKIP_WORDS = new Set([
  "the",
  "de",
  "by",
  "at",
  "and",
  "&",
  "residences",
  "residence",
]);

export function initials(name: string): string {
  const words = name
    .replace(/[()]/g, "")
    .split(/\s+/)
    .filter((w) => w && !SKIP_WORDS.has(w.toLowerCase()));
  const picked = words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "");
  return picked.join("") || name.slice(0, 2).toUpperCase();
}
