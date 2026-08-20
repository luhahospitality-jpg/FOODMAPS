import type { Metadata } from "next";
import Link from "next/link";
import { brands, categoryLabel, categoryDescription } from "@/data/bda/brands";
import type { BrandCategory } from "@/types/bda";

export const metadata: Metadata = {
  title: "Marcas — BDA",
  description: "Las marcas que firman branded residences en el mundo.",
};

const categories: BrandCategory[] = ["moda", "servicios", "lifestyle"];

export default function MarcasPage() {
  return (
    <div>
      <section className="mx-auto max-w-6xl px-5 pb-10 pt-16 sm:px-8 sm:pt-24">
        <p className="bda-mono text-[11px] uppercase tracking-[0.2em] text-bda-gold">
          Índice de marcas
        </p>
        <h1 className="bda-serif mt-5 max-w-2xl text-4xl leading-[1.1] text-bda-ink sm:text-5xl">
          Quién firma una branded residence.
        </h1>
      </section>

      {categories.map((cat) => {
        const catBrands = brands.filter((b) => b.category === cat);
        return (
          <section key={cat} id={cat} className="scroll-mt-24 border-t bda-hairline">
            <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
              <div className="flex items-baseline justify-between">
                <h2 className="bda-serif text-2xl text-bda-ink sm:text-3xl">
                  {categoryLabel[cat]}
                </h2>
                <p className="text-sm text-bda-muted">
                  {categoryDescription[cat]}
                </p>
              </div>
              <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {catBrands.map((brand) => (
                  <Link
                    key={brand.slug}
                    href={`/bda/mapa?marca=${brand.slug}`}
                    className="group flex items-center justify-between rounded-2xl border bda-hairline bg-bda-bg-raised p-6 transition-colors hover:border-bda-gold/50"
                  >
                    <div>
                      <p className="bda-serif text-lg text-bda-ink">
                        {brand.name}
                      </p>
                      <p className="mt-1 text-sm text-bda-muted">
                        {brand.description}
                      </p>
                    </div>
                    <span className="bda-mono shrink-0 pl-4 text-[10px] text-bda-muted transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
