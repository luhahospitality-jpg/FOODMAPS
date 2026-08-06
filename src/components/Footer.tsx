import { CheckerIcon } from "./CheckerIcon";
import type { Lang } from "@/types/city";
import { t } from "@/lib/dictionary";

export function Footer({ lang = "es" }: { lang?: Lang }) {
  const dict = t(lang);

  return (
    <footer className="border-t-2 border-ink bg-ink text-paper">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-center gap-2">
          <CheckerIcon size={16} />
          <span className="font-display text-xl font-black uppercase">
            FoodMaps
          </span>
        </div>
        <p className="max-w-md font-label text-xs leading-relaxed text-paper/70">
          {dict.footer.text}
        </p>
      </div>
    </footer>
  );
}
