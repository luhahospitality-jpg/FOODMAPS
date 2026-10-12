import type { Metadata } from "next";
import { ArcadeTV } from "@/components/arcade/ArcadeTV";

export const metadata: Metadata = {
  title: "FoodMaps Arcade",
  description: "Juegos para la tele con el móvil como mando.",
  robots: { index: false },
};

export default function ArcadePage() {
  return <ArcadeTV />;
}
