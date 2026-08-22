import Link from "next/link";
import { brands, categoryLabel, categoryDescription } from "@/data/bda/brands";
import { news } from "@/data/bda/news";
import type { BrandCategory } from "@/types/bda";

const categories: BrandCategory[] = ["moda", "servicios", "lifestyle"];

export default function BdaHomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative flex min-h-screen items-end overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/bda/hero/hero-2.jpg"
          alt="SLS Lux Puerto Madero, Buenos Aires"
          className="absolute inset-0 h-full w-full object-cover"
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
          <p className="bda-mono text-[11px] uppercase tracking-[0.3em] text-white/80">
            Branded Development Associates.
          </p>
          <h1 className="bda-serif mt-6 max-w-2xl text-4xl font-semibold uppercase leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl">
            Cada marca,
            <br />
            una dirección.
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-white/80 sm:text-lg">
            Un archivo documental de las branded residences del mundo. Sin
            inquiries, sin ventas.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-5">
            <Link
              href="/bda/mapa"
              className="rounded-full bg-white px-7 py-3.5 text-sm tracking-wide text-bda-ink transition-opacity hover:opacity-85"
            >
              Explorar el mapa
            </Link>
            <Link
              href="/bda/marcas"
              className="bda-mono text-[11px] uppercase tracking-[0.14em] text-white/80 transition-colors hover:text-white"
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

      {/* Noticias — preview */}
      <section className="border-t bda-hairline">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="flex items-end justify-between gap-4">
            <h2 className="bda-serif text-2xl text-bda-ink">Noticias</h2>
            <Link
              href="/bda/noticias"
              className="bda-mono shrink-0 text-[11px] uppercase tracking-[0.14em] text-bda-muted transition-colors hover:text-bda-ink"
            >
              Ver todas →
            </Link>
          </div>
          <div className="bda-scroll-x mt-8 flex gap-4 overflow-x-auto pb-1">
            {news.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-[210px] shrink-0 rounded-2xl border bda-hairline bg-bda-bg-raised p-5 transition-colors hover:border-bda-gold/50"
              >
                <p className="bda-mono text-[9px] uppercase tracking-[0.12em] text-bda-gold">
                  {item.region} · {item.date}
                </p>
                <p className="bda-serif mt-2 text-sm leading-snug text-bda-ink">
                  {item.headline}
                </p>
              </a>
            ))}
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
