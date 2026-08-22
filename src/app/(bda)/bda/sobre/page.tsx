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
];

const milestones = [
  {
    year: "1991–2000",
    title: "Palermo Chico Real Estate",
    description:
      "Comercialización y asesoramiento integral de unidades premium.",
  },
  {
    year: "2000–2006",
    title: "Inmobisite",
    description:
      "La primera inmobiliaria con plataforma virtual. Alianza con Dypsa y Atrea BBVA (Europa), 2004–2010.",
  },
  {
    year: "2006–2010",
    title: "Fundación de BDA Realty",
    description:
      "Alianza comercial con DYPSA Desarrollos y Proyectos — Dypsa International Realty. Comercialización de Renoir Torre I y II (Puerto Madero), Torre Mayor (Olivos) y Young's Stone (San Telmo).",
  },
  {
    year: "2009–2016",
    title: "Alianza con Grupo Alvear",
    description:
      "Marketing y comercialización exclusiva de Alvear Icon Hotel & Residences, vendido en su totalidad, y de Alvear Tower — la torre residencial más alta de Sudamérica en su momento.",
  },
  {
    year: "2016",
    title: "Asociación con Related Group",
    description:
      "Lanzamiento y comercialización de SLS LUX Puerto Madero y sus SLS LUX Hotel Designer Suites.",
  },
];

const serviceGroups = [
  {
    title: "Desarrollo de negocio",
    items: [
      "Análisis y factibilidad de nuevos proyectos",
      "Búsqueda de tierra para desarrollos",
      "Diseño de precios y formas de pago",
    ],
  },
  {
    title: "Marketing y marca",
    items: [
      "Marketing integral",
      "Diseño y posicionamiento de marca",
      "Webs, brochures y comunicación",
    ],
  },
  {
    title: "Comercialización",
    items: [
      "Armado de equipos comerciales",
      "Generación de bases de datos",
      "Red de brokers e inmobiliarias asociadas",
    ],
  },
  {
    title: "Asesoramiento",
    items: ["Notarial, fiscal y contable"],
  },
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

      {/* Trayectoria */}
      <section className="border-t bda-hairline">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
          <p className="bda-mono text-[10px] uppercase tracking-[0.14em] text-bda-muted">
            Trayectoria
          </p>
          <h2 className="bda-serif mt-3 max-w-xl text-2xl leading-snug text-bda-ink sm:text-3xl">
            Más de tres décadas en Premium Real Estate.
          </h2>
          <div className="mt-10">
            {milestones.map((m, i) => (
              <div
                key={m.year}
                className={`bda-reveal grid gap-2 py-7 sm:grid-cols-[140px_1fr] sm:gap-8 ${
                  i > 0 ? "border-t bda-hairline" : ""
                }`}
              >
                <p className="bda-mono text-sm text-bda-gold">{m.year}</p>
                <div>
                  <p className="bda-serif text-lg text-bda-ink">{m.title}</p>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-bda-muted">
                    {m.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Servicios */}
      <section className="border-t bda-hairline">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
          <p className="bda-mono text-[10px] uppercase tracking-[0.14em] text-bda-muted">
            Servicios
          </p>
          <h2 className="bda-serif mt-3 max-w-xl text-2xl leading-snug text-bda-ink sm:text-3xl">
            Intermediación, marketing y desarrollo de proyectos.
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {serviceGroups.map((group) => (
              <div
                key={group.title}
                className="bda-reveal rounded-2xl border bda-hairline bg-bda-bg-raised p-6"
              >
                <p className="bda-mono text-[10px] uppercase tracking-[0.14em] text-bda-gold">
                  {group.title}
                </p>
                <ul className="mt-3 space-y-2">
                  {group.items.map((item) => (
                    <li
                      key={item}
                      className="text-sm leading-relaxed text-bda-muted"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Presencia internacional */}
      <section className="border-t bda-hairline">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
          <p className="bda-mono text-[10px] uppercase tracking-[0.14em] text-bda-muted">
            Presencia internacional
          </p>
          <p className="bda-serif mt-3 max-w-2xl text-xl leading-snug text-bda-ink sm:text-2xl">
            Salones inmobiliarios en Argentina, Madrid, Barcelona, Valencia,
            París y Dubái.
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-bda-muted">
            Alianza estratégica con Axis Realty Trust by Douglas Elliman,
            para inversiones residenciales, hoteleras y comerciales en Miami
            y el sur de Florida.
          </p>
        </div>
      </section>

      {/* Equipo */}
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
