import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Marquee } from "@/components/Marquee";
import { CityCard } from "@/components/CityCard";
import { CheckerIcon } from "@/components/CheckerIcon";
import { HtmlLangSync } from "@/components/HtmlLangSync";
import { citiesIndex } from "@/data/cities-index";
import type { Lang } from "@/types/city";
import { t } from "@/lib/dictionary";

export function HomeView({ lang }: { lang: Lang }) {
  const dict = t(lang);
  const availableCount = citiesIndex.filter((c) => c.available).length;

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <HtmlLangSync lang={lang} />
      <Navbar lang={lang} />

      <main className="flex-1">
        <section className="border-b-2 border-ink bg-paper px-5 py-16 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-center gap-2">
              <CheckerIcon size={16} />
              <span className="font-label text-xs font-bold tracking-widest text-ink/60 uppercase">
                {dict.home.kicker}
              </span>
            </div>
            <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[0.95] font-black uppercase sm:text-7xl">
              {dict.home.titleStart}
              <span className="bg-mustard px-2">{dict.home.titleHighlight}</span>
              {dict.home.titleEnd}
            </h1>
            <p className="mt-6 max-w-xl font-body text-lg leading-relaxed text-ink/75">
              {dict.home.lead}
            </p>
          </div>
        </section>

        <Marquee text={dict.home.marquee} />

        <section className="px-5 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex items-end justify-between gap-4">
              <h2 className="font-display text-3xl font-black uppercase sm:text-4xl">
                {dict.home.citiesHeading}
              </h2>
              <span className="font-label text-xs font-bold text-ink/60 uppercase">
                {dict.home.listsCount(availableCount, citiesIndex.length)}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {citiesIndex.map((city, i) => (
                <CityCard key={city.slug} city={city} index={i} lang={lang} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer lang={lang} />
    </div>
  );
}
