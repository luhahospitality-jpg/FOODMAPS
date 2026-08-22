import type { Metadata } from "next";
import MarcasPageClient from "./MarcasPageClient";

export const metadata: Metadata = {
  title: "Marcas — BDA",
  description: "Las marcas que definen cómo se vive el lujo, en el mundo.",
};

export default function MarcasPage() {
  return <MarcasPageClient />;
}
