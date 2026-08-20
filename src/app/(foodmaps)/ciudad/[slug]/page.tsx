import { CityView } from "@/components/CityView";
import { getAvailableCitySlugs } from "@/lib/cities";

export function generateStaticParams() {
  return getAvailableCitySlugs().map((slug) => ({ slug }));
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CityView slug={slug} lang="es" />;
}
