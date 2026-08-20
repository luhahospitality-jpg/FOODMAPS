import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sobre BDA",
  description:
    "BDA Realty: Commercial Leadership en branded residences y trophy assets desde 1991.",
};

const timeline = [
  { year: "1991", label: "Origen en Buenos Aires con Palermo Chico Real Estate." },
  { year: "2006", label: "Nace BDA Realty y el modelo Master Broker & Commercial Leadership." },
  { year: "2016", label: "Dirección comercial de SLS Lux Puerto Madero, validando el modelo con marcas globales." },
  { year: "2024", label: "Apertura de BDA International en Madrid." },
  { year: "2025–26", label: "Dirección comercial de SLS Infantas, Banyan Tree Padilla y Palacio Torre Almiranta." },
];

const team = [
  { name: "Ricardo Fernández", role: "Founding Partner · Residencial de lujo" },
  { name: "Marcelo Cusmai", role: "Founding Partner · Estructuración y negociación" },
  { name: "Emiliano Solar Arias", role: "International Partner · Estrategia y analítica" },
  { name: "Rafael Fernández Sande", role: "International Partner · Branded Residences" },
  { name: "Elena Loewenthal", role: "Strategic Marketing Partner" },
];

const heritage = [
  {
    name: "Casa Anchorena",
    place: "Recoleta, Buenos Aires",
    note: "Restauración integral de una residencia histórica.",
  },
  {
    name: "Palacio Torre Almiranta",
    place: "Chamberí, Madrid",
    note: "Colección residencial en un edificio patrimonial madrileño.",
  },
];

export default function SobrePage() {
  return (
    <div>
      <section className="mx-auto max-w-6xl px-5 pb-10 pt-16 sm:px-8 sm:pt-24">
        <p className="bda-mono text-[11px] uppercase tracking-[0.2em] text-bda-gold">
          Sobre BDA
        </p>
        <h1 className="bda-serif mt-5 max-w-2xl text-4xl leading-[1.1] text-bda-ink sm:text-5xl">
          Commercial Leadership desde 1991.
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-bda-muted">
          BDA integra la Dirección Comercial en desarrollos residenciales de
          lujo y branded residences: estrategia, marca y comercialización
          bajo una sola visión, para que el valor creado permanezca en el
          desarrollador.
        </p>
      </section>

      <section className="border-t bda-hairline">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-5 py-14 sm:grid-cols-4 sm:px-8 sm:py-16">
          {[
            { value: "30+", label: "Años desarrollando el modelo" },
            { value: "US$500M+", label: "Comercializado en Argentina" },
            { value: "€80M", label: "Comercializado en España" },
            { value: "15+", label: "Proyectos como Master Broker" },
          ].map((s) => (
            <div key={s.label}>
              <p className="bda-serif text-3xl text-bda-ink sm:text-4xl">{s.value}</p>
              <p className="bda-mono mt-2 text-[10px] uppercase tracking-[0.14em] text-bda-muted">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t bda-hairline">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
          <h2 className="bda-serif text-2xl text-bda-ink">Trayectoria</h2>
          <div className="mt-8 space-y-6 border-l bda-hairline pl-6">
            {timeline.map((t) => (
              <div key={t.year} className="relative">
                <span className="absolute -left-[27px] top-1.5 h-2 w-2 rounded-full bg-bda-gold" />
                <p className="bda-mono text-[10px] uppercase tracking-[0.14em] text-bda-gold">
                  {t.year}
                </p>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-bda-ink/85">
                  {t.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t bda-hairline">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
          <h2 className="bda-serif text-2xl text-bda-ink">Equipo</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((m) => (
              <div key={m.name} className="border-t bda-hairline pt-4">
                <p className="text-sm text-bda-ink">{m.name}</p>
                <p className="mt-1 text-xs text-bda-muted">{m.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t bda-hairline">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
          <h2 className="bda-serif text-2xl text-bda-ink">
            Trophy assets sin marca
          </h2>
          <p className="mt-3 max-w-xl text-sm text-bda-muted">
            Algunos proyectos de BDA no llevan el sello de una marca — su
            valor está en el patrimonio arquitectónico. No forman parte del
            mapa por marca, pero sí de su portfolio como Master Broker.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {heritage.map((h) => (
              <div key={h.name} className="border-t bda-hairline pt-4">
                <p className="bda-serif text-base text-bda-ink">{h.name}</p>
                <p className="mt-1 text-xs text-bda-muted">{h.place}</p>
                <p className="mt-3 text-sm leading-relaxed text-bda-ink/70">
                  {h.note}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
