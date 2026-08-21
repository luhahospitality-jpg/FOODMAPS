import type { Metadata } from "next";
import { news, newsRegions } from "@/data/bda/news";

export const metadata: Metadata = {
  title: "Noticias — BDA",
  description:
    "Últimas noticias de branded residences en España, Portugal, Italia, Francia, Reino Unido, Estados Unidos y Sudamérica.",
};

export default function NoticiasPage() {
  return (
    <div>
      <section className="mx-auto max-w-6xl px-5 pb-10 pt-16 sm:px-8 sm:pt-24">
        <p className="bda-mono text-[11px] uppercase tracking-[0.2em] text-bda-gold">
          Noticias
        </p>
        <h1 className="bda-serif mt-5 max-w-2xl text-4xl leading-[1.1] text-bda-ink sm:text-5xl">
          El mercado, país por país.
        </h1>
      </section>

      {newsRegions.map((region) => {
        const items = news.filter((n) => n.region === region);
        if (items.length === 0) return null;
        return (
          <section key={region} className="border-t bda-hairline">
            <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
              <h2 className="bda-serif text-2xl text-bda-ink sm:text-3xl">
                {region}
              </h2>
              <div className="mt-9 grid gap-5 sm:grid-cols-2">
                {items.map((item) => (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col rounded-2xl border bda-hairline bg-bda-bg-raised p-6 transition-colors hover:border-bda-gold/50"
                  >
                    <p className="bda-mono text-[10px] uppercase tracking-[0.14em] text-bda-muted">
                      {item.date} · {item.source}
                    </p>
                    <p className="bda-serif mt-3 text-lg leading-snug text-bda-ink">
                      {item.headline}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-bda-muted">
                      {item.summary}
                    </p>
                  </a>
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
