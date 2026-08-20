import type { Metadata } from "next";
import { HomeView } from "@/components/HomeView";

export const metadata: Metadata = {
  title: "FoodMaps — Curated food maps",
  description:
    "The Top 5 of every city, with real sources, and the full map a click away on Google Maps.",
};

export default function HomeEn() {
  return <HomeView lang="en" />;
}
