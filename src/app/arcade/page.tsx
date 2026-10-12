import type { Metadata } from "next";
import { ArcadeTV } from "@/components/arcade/ArcadeTV";

export const metadata: Metadata = {
  title: "Arcade Retro",
  description: "Juegos retro en la tele con el móvil como mando.",
  robots: { index: false },
};

export default function ArcadePage() {
  return <ArcadeTV />;
}
