import { notFound } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Marquee } from "@/components/Marquee";
import { PlaceCard } from "@/components/PlaceCard";
import { CheckerIcon } from "@/components/CheckerIcon";
import { HtmlLangSync } from "@/components/HtmlLangSync";
import { getLocalizedCityData } from "@/lib/cities";
import type { Lang } from "@/types/city";
import { t } from "@/lib/dictionary";

export function CityView({ slug, lang }: { slug: string; lang: Lang }) {
  const city = getLocalizedCityData(slug, lang);

  if (!city) {
    notFound();
  }

  const dict = t(lang);
  const backHref = lang === "es" ? "/" : "/en";
  const otherLangHref =
    lang === "es" ? `/en/city/${slug}` : `/ciudad/${slug}`;

  const top5 = [...city.places]
    .filter((p) => p.is_top5)
    .sort((a, b) => (a.top5_rank ?? 0) - (b.top5_rank ?? 0));

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <HtmlLangSync lang={lang} />
      <Navbar lang={lang} switchHref={otherLangHref} />

      <main className="flex-1">
        <section className="border-b-2 border-ink bg-paper px-5 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <Link
              href={backHref}
              className="font-label text-xs font-bold tracking-widest text-ink/60 uppercase hover:text-ink"
            >
              {dict.city.backLink}
            </Link>
            <div className="mt-4 flex items-center gap-2">
              <CheckerIcon size={16} />
              <span className="font-label text-xs font-bold tracking-widest text-ink/60 uppercase">
                {city.country} · {dict.city.placesInvestigated(city.totalPlaces)}
              </span>
            </div>
            <h1 className="mt-3 font-display text-6xl leading-[0.9] font-black uppercase sm:text-8xl">
              {city.name}
            </h1>
            <p className="mt-5 max-w-xl font-body text-lg leading-relaxed text-ink/75">
              {city.tagline}
            </p>
          </div>
        </section>

        <Marquee
          text={dict.city.marquee(top5.length, city.name, city.totalPlaces)}
          tone="mustard"
        />

        <section className="px-5 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="font-display text-3xl font-black uppercase sm:text-4xl">
              {dict.city.topHeading(top5.length)}
            </h2>
            <p className="mt-2 max-w-lg font-body text-sm text-ink/70">
              {dict.city.topSubheading}
            </p>

            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {top5.map((place) => (
                <PlaceCard key={place.name} place={place} lang={lang} />
              ))}
            </div>
          </div>
        </section>

        {city.mymaps_url && (
          <section className="border-t-2 border-ink bg-ink px-5 py-16 sm:px-8">
            <div className="mx-auto flex max-w-6xl flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-3xl font-black text-paper uppercase sm:text-4xl">
                  {dict.city.fullListHeading(city.totalPlaces)}
                </h3>
                <p className="mt-2 max-w-md font-body text-sm text-paper/70">
                  {dict.city.fullListBody}
                </p>
              </div>
              <a
                href={city.mymaps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-2 rounded-full border-2 border-mustard bg-mustard px-6 py-3 font-label text-sm font-bold tracking-wide text-ink uppercase shadow-hard transition-transform hover:-translate-y-0.5"
              >
                {dict.city.viewFullMap}
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </section>
        )}
      </main>

      <Footer lang={lang} />
    </div>
  );
}
