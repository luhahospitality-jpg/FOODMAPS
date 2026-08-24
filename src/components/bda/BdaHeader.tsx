"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/bda/LocaleContext";
import { locales, localeLabel, localeName, type Locale } from "@/data/bda/i18n";

export default function BdaHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/bda";
  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const { locale, setLocale, t } = useLocale();

  const links = [
    { href: "/bda/mapa", label: t("nav_mapa") },
    { href: "/bda/marcas", label: t("nav_marcas") },
    { href: "/bda/noticias", label: t("nav_noticias") },
    { href: "/bda/sobre", label: t("nav_nosotros") },
  ];

  useEffect(() => {
    setOpen(false);
    setLangOpen(false);
  }, [pathname]);

  return (
    <header
      className={`z-40 w-full ${
        isHome
          ? "absolute left-0 top-0"
          : "sticky top-0 border-b bda-hairline bg-bda-bg/90 backdrop-blur"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? t("cerrar_menu") : t("abrir_menu")}
            aria-expanded={open}
            className={`flex flex-col items-start justify-center gap-[5px] rounded-full p-1 ${
              isHome ? "text-white" : "text-bda-ink"
            }`}
          >
            <span
              className={`block h-[1.5px] w-6 bg-current transition-transform ${
                open ? "translate-y-[6.5px] rotate-45" : ""
              }`}
            />
            <span
              className={`block h-[1.5px] w-6 bg-current transition-opacity ${
                open ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`block h-[1.5px] w-6 bg-current transition-transform ${
                open ? "-translate-y-[6.5px] -rotate-45" : ""
              }`}
            />
          </button>
          <Link
            href="/bda"
            className={`bda-serif text-xl font-medium tracking-tight ${
              isHome ? "text-white" : "text-bda-ink"
            }`}
          >
            BDA
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setLangOpen((v) => !v)}
              aria-label={t("abrir_idioma")}
              aria-expanded={langOpen}
              className={`bda-mono rounded-full border px-3.5 py-2 text-[10px] uppercase tracking-[0.14em] transition-colors duration-300 hover:border-bda-gold hover:text-bda-gold ${
                isHome
                  ? "border-white/70 text-white"
                  : "border-bda-line text-bda-ink"
              }`}
            >
              {localeLabel[locale]}
            </button>
            <div
              className={`absolute right-0 top-full z-50 mt-2 origin-top-right overflow-hidden rounded-2xl border bda-hairline bg-bda-bg shadow-lg transition-all duration-200 ${
                langOpen
                  ? "pointer-events-auto scale-100 opacity-100"
                  : "pointer-events-none scale-95 opacity-0"
              }`}
            >
              <div className="flex flex-col py-2">
                {locales.map((l: Locale) => (
                  <button
                    key={l}
                    onClick={() => {
                      setLocale(l);
                      setLangOpen(false);
                    }}
                    aria-current={l === locale}
                    className="bda-mono flex items-center gap-2 whitespace-nowrap px-5 py-2.5 text-left text-[11px] uppercase tracking-[0.14em] text-bda-muted transition-colors hover:bg-bda-bg-raised-2 hover:text-bda-ink aria-[current=true]:text-bda-ink"
                  >
                    <span className="w-6 text-bda-gold">{localeLabel[l]}</span>
                    {localeName[l]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Link
            href="/bda/mapa"
            className={`bda-mono rounded-full px-5 py-2.5 text-[10px] uppercase tracking-[0.14em] transition-colors duration-300 hover:bg-bda-gold hover:text-white ${
              isHome
                ? "border border-white/70 text-white"
                : "bg-bda-ink text-bda-bg"
            }`}
          >
            {t("ver_el_mapa")}
          </Link>
        </div>
      </div>

      {/* Dropdown menu — unfolds from the top-left corner */}
      <div
        className={`absolute left-5 top-full z-50 mt-2 origin-top-left overflow-hidden rounded-2xl border bda-hairline bg-bda-bg shadow-lg transition-all duration-200 sm:left-8 ${
          open
            ? "pointer-events-auto scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        <nav className="flex flex-col py-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="bda-mono px-6 py-3 text-[11px] uppercase tracking-[0.14em] text-bda-muted transition-colors hover:bg-bda-bg-raised-2 hover:text-bda-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
