// Shared wire format between the TV screen (/arcade) and phone pads (/arcade/pad).
// Pairing goes through the public PeerJS broker; inputs then travel peer-to-peer
// over a WebRTC data channel.

export const BUTTONS = ["up", "down", "left", "right", "a", "b", "start", "menu"] as const;
export type Button = (typeof BUTTONS)[number];

export type PadMessage =
  | { t: "hello" }
  | { t: "btn"; b: Button; d: boolean };

export type TvMessage =
  | { t: "welcome"; player: number }
  | { t: "full" }
  | { t: "rumble"; ms: number };

const PEER_PREFIX = "foodmaps-arcade-";
// No 0/O/1/I so the code is easy to read off a TV and type on a phone.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const MAX_PLAYERS = 2;

export function randomRoomCode(length = 4): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export function normalizeRoomCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
}

export function peerIdFor(code: string): string {
  return PEER_PREFIX + code.toLowerCase();
}

// Defaults to the free public PeerJS broker; set NEXT_PUBLIC_PEER_HOST to use your own
// (`npx peer --port 9000`), e.g. if the public one is down or blocked on your network.
export function peerOptions() {
  const host = process.env.NEXT_PUBLIC_PEER_HOST;
  if (!host) return {};
  return {
    host,
    port: Number(process.env.NEXT_PUBLIC_PEER_PORT ?? 443),
    path: process.env.NEXT_PUBLIC_PEER_PATH ?? "/",
    secure: process.env.NEXT_PUBLIC_PEER_SECURE !== "false",
  };
}

export function isButton(value: unknown): value is Button {
  return typeof value === "string" && (BUTTONS as readonly string[]).includes(value);
}
