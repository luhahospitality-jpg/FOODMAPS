import type { Metadata } from "next";
import Link from "next/link";
import { brands, categoryLabel, categoryDescription } from "@/data/bda/brands";
import type { BrandCategory } from "@/types/bda";
import { projectCountForBrand } from "@/lib/bda/stats";

export const metadata: Metadata = {
  title: "Marcas — BDA",
  description:
    "Las marcas que firman branded residences en el mundo, agrupadas en moda, servicios y lifestyle.",
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
        <p className="mt-6 max-w-xl text-base leading-relaxed text-bda-muted">
          No todas las marcas llegan al residencial desde el mismo lugar.
          Unas vienen de la moda, otras de la hospitalidad, y unas pocas, del
          automóvil.
        </p>
      </section>

      {categories.map((cat) => {
        const catBrands = brands.filter((b) => b.category === cat);
        return (
          <section key={cat} id={cat} className="scroll-mt-24 border-t bda-hairline">
            <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
                <h2 className="bda-serif text-2xl text-bda-ink sm:text-3xl">
                  {categoryLabel[cat]}
                </h2>
                <p className="text-sm text-bda-muted">
                  {categoryDescription[cat]}
                </p>
              </div>
              <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {catBrands.map((brand) => {
                  const count = projectCountForBrand(brand.slug);
                  return (
                    <Link
                      key={brand.slug}
                      href={`/bda/mapa?marca=${brand.slug}`}
                      className="group flex flex-col justify-between rounded-2xl border bda-hairline bg-bda-bg-raised p-6 transition-colors hover:border-bda-gold/50 sm:min-h-[190px]"
                    >
                      <div>
                        <p className="bda-serif text-lg text-bda-ink">
                          {brand.name}
                        </p>
                        <p className="bda-mono mt-1 text-[10px] uppercase tracking-[0.14em] text-bda-muted">
                          {brand.origin}
                        </p>
                        <p className="mt-4 text-sm leading-relaxed text-bda-muted">
                          {brand.description}
                        </p>
                      </div>
                      <div className="mt-6 flex items-center justify-between">
                        <span className="bda-mono text-[10px] uppercase tracking-[0.14em] text-bda-ink/60">
                          {count} {count === 1 ? "proyecto" : "proyectos"} en el mapa
                        </span>
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
        );
      })}
    </div>
  );
}
