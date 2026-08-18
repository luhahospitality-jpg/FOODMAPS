export type SourceKind = "video" | "web" | "unknown";

export interface SourceThumbnail {
  kind: SourceKind;
  imageUrl: string | null;
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
  if (!url) return { kind: "unknown", imageUrl: null };

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { kind: "unknown", imageUrl: null };
  }

  const hostname = parsed.hostname.replace(/^www\./, "");

  const youtubeId = extractYouTubeId(parsed, hostname);
  if (youtubeId) {
    return {
      kind: "video",
      imageUrl: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
    };
  }

  if (videoHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))) {
    return {
      kind: "video",
      imageUrl: `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`,
    };
  }

  return {
    kind: "web",
    imageUrl: `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`,
  };
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
