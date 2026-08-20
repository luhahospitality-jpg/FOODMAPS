import Link from "next/link";

export default function BdaFooter() {
  return (
    <footer className="border-t bda-hairline">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md">
            <p className="bda-serif text-lg text-bda-ink">BDA Realty</p>
            <p className="mt-2 text-sm leading-relaxed text-bda-muted">
              Branded Development Associates. Commercial Leadership en
              proyectos residenciales de lujo desde 1991, con presencia en
              Madrid, Marbella, Buenos Aires, Punta del Este y Miami.
            </p>
          </div>
          <div className="flex gap-10">
            <div>
              <p className="bda-mono text-[10px] uppercase tracking-[0.18em] text-bda-muted">
                Explorar
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link href="/bda" className="text-bda-ink/80 hover:text-bda-ink">
                    Qué es una Branded
                  </Link>
                </li>
                <li>
                  <Link href="/bda/marcas" className="text-bda-ink/80 hover:text-bda-ink">
                    Marcas
                  </Link>
                </li>
                <li>
                  <Link href="/bda/mapa" className="text-bda-ink/80 hover:text-bda-ink">
                    Mapa Global
                  </Link>
                </li>
                <li>
                  <Link href="/bda/sobre" className="text-bda-ink/80 hover:text-bda-ink">
                    Sobre BDA
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <p className="bda-mono mt-10 text-[10px] uppercase tracking-[0.14em] text-bda-muted/70">
          BDA · Archivo documental, no comercial · © {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
