import Link from "next/link";
import { brands, categoryLabel, categoryDescription } from "@/data/bda/brands";
import type { BrandCategory } from "@/types/bda";

const categories: BrandCategory[] = ["moda", "servicios", "lifestyle"];

export default function BdaHomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <span
          aria-hidden
          className="bda-serif pointer-events-none absolute -right-4 -top-10 select-none text-[220px] leading-none text-bda-ink/[0.05] sm:text-[320px]"
        >
          1991
        </span>
        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24">
          <p className="bda-mono text-[11px] uppercase tracking-[0.2em] text-bda-gold">
            BDA · Commercial Leadership desde 1991
          </p>
          <h1 className="bda-serif mt-5 max-w-3xl text-4xl leading-[1.1] text-bda-ink sm:text-6xl">
            Las branded residences del mundo, en un solo lugar.
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-bda-muted sm:text-lg">
            Un archivo documental. Sin inquiries, sin ventas.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-5">
            <Link
              href="/bda/mapa"
              className="rounded-full bg-bda-ink px-7 py-3.5 text-sm tracking-wide text-bda-bg transition-opacity hover:opacity-85"
            >
              Explorar el mapa
            </Link>
            <Link
              href="/bda/marcas"
              className="bda-mono text-[11px] uppercase tracking-[0.14em] text-bda-muted transition-colors hover:text-bda-ink"
            >
              Las marcas →
            </Link>
          </div>
        </div>
      </section>

      {/* Qué es una branded residence */}
      <section className="border-t bda-hairline">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="grid gap-10 sm:grid-cols-[minmax(0,220px)_1fr] sm:gap-16">
            <h2 className="bda-serif text-2xl text-bda-ink">
              ¿Qué es una
              <br />
              Branded Residence?
            </h2>
            <div className="flex gap-8">
              <div className="bda-dotted-v hidden shrink-0 sm:block" aria-hidden />
              <p className="max-w-lg text-lg leading-relaxed text-bda-ink/85">
                Una vivienda que lleva el nombre y el estándar de una marca —
                una maison, un hotel, un fabricante de coches — bajo un
                acuerdo de gestión con el promotor. La marca diseña, opera y
                firma; el residente vive dentro de esa identidad.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Categorías de marcas */}
      <section className="border-t bda-hairline">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <h2 className="bda-serif text-2xl text-bda-ink">
            Tres formas de firmar una casa.
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {categories.map((cat) => {
              const catBrands = brands.filter((b) => b.category === cat);
              return (
                <Link
                  key={cat}
                  href={`/bda/marcas#${cat}`}
                  className="group flex flex-col justify-between rounded-2xl border bda-hairline bg-bda-bg-raised p-6 transition-colors hover:border-bda-gold/50"
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

      {/* CTA final */}
      <section className="border-t bda-hairline">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <h2 className="bda-serif max-w-lg text-2xl leading-snug text-bda-ink sm:text-3xl">
            Recorre el mapa, ciudad por ciudad.
          </h2>
          <Link
            href="/bda/mapa"
            className="mt-8 inline-block rounded-full bg-bda-ink px-7 py-3.5 text-sm tracking-wide text-bda-bg transition-opacity hover:opacity-85"
          >
            Ir al mapa
          </Link>
        </div>
      </section>
    </div>
  );
}
