"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/bda/mapa", label: "Mapa" },
  { href: "/bda/marcas", label: "Marcas" },
  { href: "/bda/noticias", label: "Noticias" },
  { href: "/bda/sobre", label: "Nosotros" },
];

export default function BdaHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/bda";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
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
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
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

        <Link
          href="/bda/mapa"
          className={`bda-mono rounded-full px-5 py-2.5 text-[10px] uppercase tracking-[0.14em] transition-opacity hover:opacity-85 ${
            isHome
              ? "border border-white/70 text-white"
              : "bg-bda-ink text-bda-bg"
          }`}
        >
          Ver el mapa
        </Link>
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
