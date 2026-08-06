import Link from "next/link";
import { CheckerIcon } from "./CheckerIcon";
import type { Lang } from "@/types/city";
import { t } from "@/lib/dictionary";

export function Navbar({
  lang = "es",
  switchHref: switchHrefProp,
}: {
  lang?: Lang;
  switchHref?: string;
}) {
  const dict = t(lang);
  const home = lang === "es" ? "/" : "/en";
  const switchHref = switchHrefProp ?? (lang === "es" ? "/en" : "/");
  const switchLabel = dict.langSwitch.label;

  return (
    <header className="border-b-2 border-ink bg-paper">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href={home} className="flex items-center gap-2">
          <CheckerIcon size={20} />
          <span className="font-display text-2xl font-black tracking-tight uppercase sm:text-3xl">
            FoodMaps
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden font-label text-xs font-bold tracking-widest text-ink/60 uppercase sm:block">
            {dict.nav.tagline}
          </span>
          <Link
            href={switchHref}
            className="inline-flex items-center rounded-full border-2 border-ink px-3 py-1 font-label text-xs font-bold tracking-widest text-ink uppercase transition-colors hover:bg-mustard"
          >
            {switchLabel}
          </Link>
        </div>
      </div>
    </header>
  );
}
