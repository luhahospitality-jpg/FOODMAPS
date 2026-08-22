"use client";

import Link from "next/link";
import { useLocale } from "@/components/bda/LocaleContext";

export default function BdaFooter() {
  const { t } = useLocale();

  return (
    <footer className="border-t bda-hairline bg-bda-bg">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md">
            <p className="bda-serif text-lg text-bda-ink">BDA Realty</p>
            <p className="mt-2 text-sm leading-relaxed text-bda-muted">
              {t("footer_desc")}
            </p>
          </div>
          <div className="flex gap-10">
            <div>
              <p className="bda-mono text-[10px] uppercase tracking-[0.18em] text-bda-muted">
                {t("footer_explorar")}
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link href="/bda" className="text-bda-ink/80 hover:text-bda-ink">
                    {t("footer_que_es")}
                  </Link>
                </li>
                <li>
                  <Link href="/bda/marcas" className="text-bda-ink/80 hover:text-bda-ink">
                    {t("footer_marcas")}
                  </Link>
                </li>
                <li>
                  <Link href="/bda/mapa" className="text-bda-ink/80 hover:text-bda-ink">
                    {t("footer_mapa")}
                  </Link>
                </li>
                <li>
                  <Link href="/bda/noticias" className="text-bda-ink/80 hover:text-bda-ink">
                    {t("footer_noticias")}
                  </Link>
                </li>
                <li>
                  <Link href="/bda/sobre" className="text-bda-ink/80 hover:text-bda-ink">
                    {t("footer_sobre")}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <p className="bda-mono mt-10 text-[10px] uppercase tracking-[0.14em] text-bda-muted/70">
          {t("footer_copyright")} · © {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
