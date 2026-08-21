import Link from "next/link";

const links = [
  { href: "/bda/mapa", label: "Mapa" },
  { href: "/bda/marcas", label: "Marcas" },
  { href: "/bda/noticias", label: "Noticias" },
  { href: "/bda/sobre", label: "Nosotros" },
];

export default function BdaHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bda-hairline bg-bda-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/bda" className="bda-serif text-xl font-medium tracking-tight text-bda-ink">
          BDA
        </Link>
        <nav className="flex items-center gap-5 sm:gap-8">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="bda-mono hidden text-[11px] uppercase tracking-[0.14em] text-bda-muted transition-colors hover:text-bda-ink sm:inline"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/bda/mapa"
            className="bda-mono rounded-full bg-bda-ink px-5 py-2.5 text-[10px] uppercase tracking-[0.14em] text-bda-bg transition-opacity hover:opacity-85"
          >
            Ver el mapa
          </Link>
        </nav>
      </div>
    </header>
  );
}
