import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sobre BDA",
  description: "BDA Realty: Commercial Leadership en branded residences desde 1991.",
};

const team = [
  "Ricardo Fernández",
  "Marcelo Cusmai",
  "Emiliano Solar Arias",
  "Rafael Fernández Sande",
  "Elena Loewenthal",
];

export default function SobrePage() {
  return (
    <div>
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-16 sm:px-8 sm:pb-24 sm:pt-24">
        <p className="bda-mono text-[11px] uppercase tracking-[0.2em] text-bda-gold">
          Sobre BDA
        </p>
        <h1 className="bda-serif mt-5 max-w-2xl text-4xl leading-[1.1] text-bda-ink sm:text-5xl">
          Commercial Leadership desde 1991.
        </h1>
        <p className="mt-6 max-w-md text-base leading-relaxed text-bda-muted">
          Dirección comercial de branded residences y trophy assets, en
          Madrid, Marbella, Buenos Aires, Punta del Este y Miami.
        </p>
      </section>

      <section className="border-t bda-hairline">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
          <p className="bda-mono text-[10px] uppercase tracking-[0.14em] text-bda-muted">
            Equipo
          </p>
          <p className="bda-serif mt-3 max-w-2xl text-2xl leading-snug text-bda-ink sm:text-3xl">
            {team.join(" · ")}
          </p>
        </div>
      </section>
    </div>
  );
}
