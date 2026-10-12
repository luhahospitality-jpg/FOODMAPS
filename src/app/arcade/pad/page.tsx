import type { Metadata, Viewport } from "next";
import { ArcadePad } from "@/components/arcade/ArcadePad";
import { normalizeRoomCode } from "@/components/arcade/protocol";

export const metadata: Metadata = {
  title: "Mando · Arcade Retro",
  robots: { index: false },
};

// Lock zoom so fast double-taps on the buttons don't zoom the page.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0b0603",
};

export default async function PadPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { room } = await searchParams;
  const code = normalizeRoomCode(typeof room === "string" ? room : "");
  return <ArcadePad initialRoom={code.length === 4 ? code : ""} />;
}
