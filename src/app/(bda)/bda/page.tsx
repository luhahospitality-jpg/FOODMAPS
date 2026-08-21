import Link from "next/link";
import { brands, categoryLabel, categoryDescription } from "@/data/bda/brands";
import type { BrandCategory } from "@/types/bda";

const categories: BrandCategory[] = ["moda", "servicios", "lifestyle"];

export default function BdaHomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="border-b bda-hairline">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="grid gap-14 lg:grid-cols-[1fr_1px_1fr] lg:gap-0">
            {/* left column */}
            <div className="lg:pr-14">
              <p className="bda-mono text-[11px] uppercase tracking-[0.3em] text-bda-gold">
                Branded Development Associates.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <span className="h-px w-16 bg-bda-ink/40" aria-hidden />
                <span className="bda-mono text-xs text-bda-ink/40" aria-hidden>
                  →
                </span>
              </div>

              <h1 className="bda-serif mt-8 max-w-md text-5xl font-semibold uppercase leading-[0.96] tracking-tight text-bda-ink sm:text-6xl lg:text-7xl">
                Branded
                <br />
                Residences.
              </h1>

              <p className="mt-8 max-w-md text-base leading-relaxed text-bda-muted sm:text-lg">
                Un archivo documental de las branded residences del mundo.
                Sin inquiries, sin ventas.
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

              <div className="mt-12 max-w-[280px]">
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
            </div>

            {/* dotted divider */}
            <div className="bda-dotted-v hidden lg:block" aria-hidden />

            {/* right column */}
            <div className="relative lg:pl-14">
              <span
                aria-hidden
                className="bda-serif pointer-events-none absolute right-1 top-0 select-none text-[110px] font-semibold leading-none text-bda-ink/[0.09] sm:text-[170px] lg:right-3"
              >
                BDA
              </span>

              <div className="relative z-10 mt-14 overflow-hidden rounded-3xl lg:mt-[84px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/bda/hero/hero-main.jpg"
                  alt="Mandarin Oriental Residences Barcelona"
                  className="aspect-[4/3] w-full object-cover"
                />
                <span className="bda-mono absolute left-5 top-5 rounded-full border border-white/40 bg-black/35 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-white backdrop-blur">
                  Desde 1991
                </span>
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
                      className="h-12 w-12 rounded-full border-2 border-bda-bg object-cover sm:h-14 sm:w-14"
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
