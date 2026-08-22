import type { Metadata } from "next";
import SobrePageClient from "./SobrePageClient";

export const metadata: Metadata = {
  title: "Sobre BDA",
  description: "BDA Realty: Commercial Leadership en branded residences desde 1991.",
};

export default function SobrePage() {
  return <SobrePageClient />;
}
