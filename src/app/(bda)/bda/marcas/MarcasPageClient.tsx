"use client";

import Link from "next/link";
import { brands } from "@/data/bda/brands";
import { useLocale } from "@/components/bda/LocaleContext";
import { categoryLabelI18n, categoryDescriptionI18n, brandDescI18n } from "@/data/bda/i18n";
import type { BrandCategory } from "@/types/bda";

const categories: BrandCategory[] = ["moda", "servicios", "lifestyle"];

export default function MarcasPageClient() {
  const { locale, t } = useLocale();
  const categoryLabel = categoryLabelI18n[locale];
  const categoryDescription = categoryDescriptionI18n[locale];

  return (
    <div>
      <section className="mx-auto max-w-6xl px-5 pb-10 pt-16 sm:px-8 sm:pt-24">
        <p className="bda-mono text-[11px] uppercase tracking-[0.2em] text-bda-gold">
          {t("marcas_eyebrow")}
        </p>
        <h1 className="bda-serif mt-5 max-w-2xl text-4xl leading-[1.1] text-bda-ink sm:text-5xl">
          {t("marcas_titulo")}
        </h1>
      </section>

      {categories.map((cat) => {
        const catBrands = brands.filter((b) => b.category === cat);
        return (
          <section key={cat} id={cat} className="scroll-mt-24 border-t bda-hairline">
            <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
              <div className="bda-reveal flex items-baseline justify-between">
                <h2 className="bda-serif text-2xl text-bda-ink sm:text-3xl">
                  {categoryLabel[cat]}
                </h2>
                <p className="text-sm text-bda-muted">
                  {categoryDescription[cat]}
                </p>
              </div>
              <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {catBrands.map((brand) => {
                  const desc =
                    locale === "es" ? brand.description : brandDescI18n[brand.slug]?.[locale] ?? brand.description;
                  return (
                    <Link
                      key={brand.slug}
                      href={`/bda/mapa?marca=${brand.slug}`}
                      className="bda-reveal group flex items-center justify-between rounded-2xl border bda-hairline bg-bda-bg-raised p-6 transition-colors hover:border-bda-gold/50"
                    >
                      <div>
                        <p className="bda-serif text-lg text-bda-ink">
                          {brand.name}
                        </p>
                        <p className="mt-1 text-sm text-bda-muted">
                          {desc}
                        </p>
                      </div>
                      <span className="bda-mono shrink-0 pl-4 text-[10px] text-bda-muted transition-transform group-hover:translate-x-1">
                        →
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
