import Link from "next/link";
import { CheckerIcon } from "./CheckerIcon";

export function Navbar() {
  return (
    <header className="border-b-2 border-ink bg-paper">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2">
          <CheckerIcon size={20} />
          <span className="font-display text-2xl font-black tracking-tight uppercase sm:text-3xl">
            FoodMaps
          </span>
        </Link>
        <span className="hidden font-label text-xs font-bold tracking-widest text-ink/60 uppercase sm:block">
          Top 5 por ciudad · mapa completo aparte
        </span>
      </div>
    </header>
  );
}
