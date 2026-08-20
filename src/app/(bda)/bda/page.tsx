import Link from "next/link";
import { brands, categoryLabel, categoryDescription } from "@/data/bda/brands";
import type { BrandCategory } from "@/types/bda";
import { getStats } from "@/lib/bda/stats";

const categories: BrandCategory[] = ["moda", "servicios", "lifestyle"];

export default function BdaHomePage() {
  const stats = getStats();

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
        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-16 sm:px-8 sm:pb-24 sm:pt-24">
          <p className="bda-mono text-[11px] uppercase tracking-[0.2em] text-bda-gold">
            Archivo documental · Commercial Leadership desde 1991
          </p>
          <h1 className="bda-serif mt-5 max-w-3xl text-4xl leading-[1.1] text-bda-ink sm:text-6xl">
            Un mapa de las branded residences del mundo.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-bda-muted sm:text-lg">
            BDA dirige la comercialización de desarrollos residenciales de lujo
            en el eje Madrid–Marbella–Buenos Aires–Punta del Este–Miami. Este
            es su archivo abierto sobre una categoría en expansión: qué es una
            branded residence, qué marcas la firman y dónde se está
            construyendo en el mundo.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-5">
            <Link
              href="/bda/mapa"
              className="rounded-full bg-bda-ink px-7 py-3.5 text-sm tracking-wide text-bda-bg transition-opacity hover:opacity-85"
            >
              Explorar el Mapa Global
            </Link>
            <Link
              href="/bda/marcas"
              className="bda-mono text-[11px] uppercase tracking-[0.14em] text-bda-muted transition-colors hover:text-bda-ink"
            >
              Ver las marcas →
            </Link>
          </div>
        </div>
      </section>

      {/* Qué es una branded residence */}
      <section className="border-t bda-hairline">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="grid gap-10 sm:grid-cols-[minmax(0,220px)_1fr] sm:gap-16">
            <h2 className="bda-serif text-2xl text-bda-ink sm:sticky sm:top-28 sm:self-start">
              ¿Qué es una
              <br />
              Branded Residence?
            </h2>
            <div className="flex gap-8">
              <div className="bda-dotted-v hidden shrink-0 sm:block" aria-hidden />
              <div className="space-y-6 text-[15px] leading-relaxed text-bda-ink/85 sm:text-base">
              <p>
                Una <strong className="text-bda-ink">branded residence</strong> es
                una vivienda de lujo que lleva el nombre y el estándar de una
                marca reconocida — una maison de moda, un grupo hotelero o un
                fabricante de automóviles — bajo un acuerdo de gestión o
                licencia con el promotor del edificio.
              </p>
              <p>
                A diferencia de un desarrollo de lujo convencional, la marca
                no solo presta su nombre: define el interiorismo, opera los
                servicios comunes — concierge, spa, valet, restauración — y en
                muchos casos gestiona la propiedad a largo plazo, igual que
                haría con uno de sus hoteles.
              </p>
              <p>
                Es una categoría que creció de forma sostenida en la última
                década: el comprador de ultra lujo valora hoy la garantía de
                estándar tanto como la ubicación, y las marcas encuentran en
                el residencial una forma de extender su identidad más allá
                del huésped de paso.
              </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categorías de marcas */}
      <section className="border-t bda-hairline">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <h2 className="bda-serif text-2xl text-bda-ink">
            Tres tipos de marca, un mismo estándar.
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-bda-muted">
            Todas prestan su nombre a un edificio residencial — pero lo hacen
            desde lugares muy distintos.
          </p>
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
                      {catBrands.length > 3 ? "…" : ""}
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

      {/* Stats */}
      <section className="border-t bda-hairline">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-5 py-16 sm:grid-cols-4 sm:px-8 sm:py-20">
          {[
            { value: stats.projectCount, label: "Proyectos documentados" },
            { value: stats.totalBrandCount, label: "Marcas" },
            { value: stats.countryCount, label: "Países" },
            { value: "1991", label: "Origen del modelo BDA" },
          ].map((s) => (
            <div key={s.label}>
              <p className="bda-serif text-4xl text-bda-ink sm:text-5xl">
                {s.value}
              </p>
              <p className="bda-mono mt-2 text-[10px] uppercase tracking-[0.14em] text-bda-muted">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="border-t bda-hairline">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <h2 className="bda-serif max-w-lg text-2xl leading-snug text-bda-ink sm:text-3xl">
            Recorre el mapa completo de proyectos, ciudad por ciudad.
          </h2>
          <Link
            href="/bda/mapa"
            className="mt-8 inline-block rounded-full bg-bda-ink px-7 py-3.5 text-sm tracking-wide text-bda-bg transition-opacity hover:opacity-85"
          >
            Ir al Mapa Global
          </Link>
        </div>
      </section>
    </div>
  );
}
