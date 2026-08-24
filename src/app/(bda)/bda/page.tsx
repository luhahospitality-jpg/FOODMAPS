"use client";

import Link from "next/link";
import { brands } from "@/data/bda/brands";
import { news } from "@/data/bda/news";
import HeroParallax from "@/components/bda/HeroParallax";
import Eyebrow from "@/components/bda/Eyebrow";
import { useLocale } from "@/components/bda/LocaleContext";
import { categoryLabelI18n, categoryDescriptionI18n, newsI18n, regionLabelI18n } from "@/data/bda/i18n";
import type { BrandCategory } from "@/types/bda";

const categories: BrandCategory[] = ["moda", "servicios", "lifestyle"];

export default function BdaHomePage() {
  const { locale, t } = useLocale();
  const categoryLabel = categoryLabelI18n[locale];
  const categoryDescription = categoryDescriptionI18n[locale];
  const regionLabel = regionLabelI18n[locale];

  return (
    <div>
      {/* Hero */}
      <section className="relative flex min-h-screen items-end overflow-hidden">
        <HeroParallax />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          id="bda-hero-bg"
          src="/bda/hero/hero-2.jpg"
          alt="SLS Lux Puerto Madero, Buenos Aires"
          className="bda-hero-bg-img absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(10,8,5,0.2) 0%, rgba(10,8,5,0.12) 38%, rgba(10,8,5,0.72) 100%)",
          }}
          aria-hidden
        />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-16 pt-40 sm:px-8 sm:pb-24 sm:pt-48">
          <Eyebrow className="text-[11px] tracking-[0.3em] text-white/80">
            {t("hero_eyebrow")}
          </Eyebrow>
          <h1 className="bda-serif mt-6 max-w-xl text-balance text-[34px] font-semibold uppercase leading-[1.05] tracking-tight text-white sm:max-w-3xl sm:text-5xl lg:max-w-4xl lg:text-6xl">
            {t("hero_claim")}
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-white/80 sm:text-lg">
            {t("hero_sub")}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-5">
            <Link
              href="/bda/mapa"
              className="rounded-full bg-white px-7 py-3.5 text-sm tracking-wide text-bda-ink transition-colors duration-300 hover:bg-bda-gold hover:text-white"
            >
              {t("explorar_el_mapa")}
            </Link>
            <Link
              href="/bda/marcas"
              className="bda-mono text-[11px] uppercase tracking-[0.14em] text-white/80 transition-colors hover:text-white"
            >
              {t("las_marcas")}
            </Link>
          </div>
        </div>
      </section>

      {/* Qué es una branded residence */}
      <section className="border-t bda-hairline">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="grid gap-10 sm:grid-cols-[minmax(0,220px)_1fr] sm:gap-16">
            <h2 className="bda-reveal bda-serif whitespace-pre-line text-2xl text-bda-ink">
              {t("quees_titulo")}
            </h2>
            <div className="bda-reveal flex gap-8">
              <div className="bda-dotted-v hidden shrink-0 sm:block" aria-hidden />
              <p className="max-w-lg text-lg leading-relaxed text-bda-ink/85">
                {t("quees_texto")}
              </p>
            </div>
          </div>

          {/* Fotos */}
          <div className="mt-16 grid gap-8 sm:grid-cols-[280px_1fr] sm:items-end">
            <div className="bda-reveal">
              <div className="overflow-hidden rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/bda/hero/hero-side.jpg"
                  alt="Plaza Hotel & Residences, Buenos Aires"
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
              <p className="mt-3 text-xs leading-snug text-bda-muted">
                Plaza Hotel &amp; Residences — Buenos Aires, Argentina
              </p>
            </div>
            <div className="bda-reveal">
              <div className="overflow-hidden rounded-3xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/bda/hero/hero-main.jpg"
                  alt="Mandarin Oriental Residences Barcelona"
                  className="aspect-[16/10] w-full object-cover"
                />
              </div>
              <div className="mt-5 flex items-center gap-4">
                <div className="flex -space-x-3">
                  {[
                    { src: "/bda/hero/hero-1.jpg", alt: "Alvear Tower, Buenos Aires" },
                    { src: "/bda/hero/hero-2.jpg", alt: "SLS Lux Puerto Madero, Buenos Aires" },
                    { src: "/bda/hero/hero-3.jpg", alt: "Four Seasons Madrid Residences" },
                  ].map((img) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={img.src}
                      src={img.src}
                      alt={img.alt}
                      className="h-12 w-12 rounded-full border-2 border-white object-cover sm:h-14 sm:w-14"
                    />
                  ))}
                </div>
                <p className="bda-mono text-[10px] uppercase leading-snug tracking-[0.1em] text-bda-muted">
                  Alvear Tower · SLS Puerto Madero
                  <br />
                  Four Seasons Madrid
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categorías de marcas */}
      <section className="border-t bda-hairline">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <h2 className="bda-reveal bda-serif text-2xl text-bda-ink">
            {t("categorias_titulo")}
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {categories.map((cat) => {
              const catBrands = brands.filter((b) => b.category === cat);
              return (
                <Link
                  key={cat}
                  href={`/bda/marcas#${cat}`}
                  className="bda-reveal group flex flex-col justify-between rounded-2xl border bda-hairline bg-bda-bg-raised p-6 transition-colors hover:border-bda-gold/50"
                >
                  <div>
                    <p className="bda-mono text-[10px] uppercase tracking-[0.18em] text-bda-gold">
                      {categoryLabel[cat]}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-bda-muted">
                      {categoryDescription[cat]}
                    </p>
                  </div>
                  <div className="mt-8 flex items-end justify-between">
                    <p className="text-xs text-bda-ink/70">
                      {catBrands
                        .slice(0, 3)
                        .map((b) => b.name)
                        .join(" · ")}
                    </p>
                    <span className="bda-mono text-[10px] text-bda-muted transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Noticias — preview */}
      <section className="border-t bda-hairline">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="bda-reveal flex items-end justify-between gap-4">
            <h2 className="bda-serif text-2xl text-bda-ink">{t("noticias_titulo")}</h2>
            <Link
              href="/bda/noticias"
              className="bda-mono shrink-0 text-[11px] uppercase tracking-[0.14em] text-bda-muted transition-colors hover:text-bda-ink"
            >
              {t("ver_todas")}
            </Link>
          </div>
          <div className="bda-scroll-x mt-8 flex gap-4 overflow-x-auto pb-1">
            {news.map((item) => {
              const headline =
                locale === "es" ? item.headline : newsI18n[item.id]?.headline[locale] ?? item.headline;
              return (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-[210px] shrink-0 rounded-2xl border bda-hairline bg-bda-bg-raised p-5 transition-colors hover:border-bda-gold/50"
                >
                  <p className="bda-mono text-[9px] uppercase tracking-[0.12em] text-bda-gold">
                    {regionLabel[item.region] ?? item.region} · {item.date}
                  </p>
                  <p className="bda-serif mt-2 text-sm leading-snug text-bda-ink">
                    {headline}
                  </p>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="border-t bda-hairline">
        <div className="bda-reveal mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <h2 className="bda-serif max-w-lg text-2xl leading-snug text-bda-ink sm:text-3xl">
            {t("cta_final_titulo")}
          </h2>
          <Link
            href="/bda/mapa"
            className="mt-8 inline-block rounded-full bg-bda-ink px-7 py-3.5 text-sm tracking-wide text-bda-bg transition-colors duration-300 hover:bg-bda-gold"
          >
            {t("ir_al_mapa")}
          </Link>
        </div>
      </section>
    </div>
  );
}
