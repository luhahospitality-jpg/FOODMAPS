export type SourceKind = "video" | "web" | "unknown";

export interface SourceThumbnail {
  kind: SourceKind;
  /** A real content frame (e.g. a YouTube thumbnail) worth showing at full size. */
  photoUrl: string | null;
  /** The source site's small favicon/logo, for use as a watermark. */
  logoUrl: string | null;
}

const videoHosts = [
  "tiktok.com",
  "instagram.com",
  "x.com",
  "twitter.com",
  "vimeo.com",
  "facebook.com",
];

export function getSourceThumbnail(url: string | null): SourceThumbnail {
  if (!url) return { kind: "unknown", photoUrl: null, logoUrl: null };

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { kind: "unknown", photoUrl: null, logoUrl: null };
  }

  const hostname = parsed.hostname.replace(/^www\./, "");
  const favicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;

  const youtubeId = extractYouTubeId(parsed, hostname);
  if (youtubeId) {
    return {
      kind: "video",
      photoUrl: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
      logoUrl: favicon,
    };
  }

  if (videoHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))) {
    return { kind: "video", photoUrl: null, logoUrl: favicon };
  }

  return { kind: "web", photoUrl: null, logoUrl: favicon };
}

function extractYouTubeId(url: URL, hostname: string): string | null {
  if (hostname === "youtu.be") {
    return url.pathname.slice(1) || null;
  }
  if (hostname.endsWith("youtube.com")) {
    if (url.pathname === "/watch") return url.searchParams.get("v");
    if (url.pathname.startsWith("/shorts/")) return url.pathname.split("/")[2] ?? null;
    if (url.pathname.startsWith("/embed/")) return url.pathname.split("/")[2] ?? null;
  }
  return null;
}
