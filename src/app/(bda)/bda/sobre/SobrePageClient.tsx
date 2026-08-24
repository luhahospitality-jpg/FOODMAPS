"use client";

import Eyebrow from "@/components/bda/Eyebrow";
import { useLocale } from "@/components/bda/LocaleContext";
import { milestonesI18n, serviceGroupsI18n } from "@/data/bda/i18n";

const team = [
  "Ricardo Fernández",
  "Marcelo Cusmai",
  "Emiliano Solar Arias",
  "Rafael Fernández Sande",
];

export default function SobrePageClient() {
  const { locale, t } = useLocale();
  const milestones = milestonesI18n[locale];
  const serviceGroups = serviceGroupsI18n[locale];

  return (
    <div>
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-16 sm:px-8 sm:pb-24 sm:pt-24">
        <Eyebrow className="text-[11px] tracking-[0.2em] text-bda-gold">
          {t("sobre_eyebrow")}
        </Eyebrow>
        <h1 className="bda-serif mt-5 max-w-2xl text-4xl leading-[1.1] text-bda-ink sm:text-5xl">
          {t("sobre_titulo")}
        </h1>
        <p className="mt-6 max-w-md text-base leading-relaxed text-bda-muted">
          {t("sobre_sub")}
        </p>
      </section>

      {/* Trayectoria */}
      <section className="border-t bda-hairline">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
          <p className="bda-mono text-[10px] uppercase tracking-[0.14em] text-bda-muted">
            {t("sobre_trayectoria_label")}
          </p>
          <h2 className="bda-serif mt-3 max-w-xl text-2xl leading-snug text-bda-ink sm:text-3xl">
            {t("sobre_trayectoria_titulo")}
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
            {t("sobre_servicios_label")}
          </p>
          <h2 className="bda-serif mt-3 max-w-xl text-2xl leading-snug text-bda-ink sm:text-3xl">
            {t("sobre_servicios_titulo")}
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
            {t("sobre_internacional_label")}
          </p>
          <p className="bda-serif mt-3 max-w-2xl text-xl leading-snug text-bda-ink sm:text-2xl">
            {t("sobre_internacional_titulo")}
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-bda-muted">
            {t("sobre_internacional_sub")}
          </p>
        </div>
      </section>

      {/* Equipo */}
      <section className="border-t bda-hairline">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
          <p className="bda-mono text-[10px] uppercase tracking-[0.14em] text-bda-muted">
            {t("sobre_equipo_label")}
          </p>
          <p className="bda-serif mt-3 max-w-2xl text-2xl leading-snug text-bda-ink sm:text-3xl">
            {team.join(" · ")}
          </p>
        </div>
      </section>
    </div>
  );
}
