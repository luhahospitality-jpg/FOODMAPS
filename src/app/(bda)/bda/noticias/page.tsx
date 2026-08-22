import type { Metadata } from "next";
import NoticiasPageClient from "./NoticiasPageClient";

export const metadata: Metadata = {
  title: "Noticias — BDA",
  description:
    "Últimas noticias de branded residences en España, Portugal, Italia, Francia, Reino Unido, Estados Unidos y Sudamérica.",
};

export default function NoticiasPage() {
  return <NoticiasPageClient />;
}
