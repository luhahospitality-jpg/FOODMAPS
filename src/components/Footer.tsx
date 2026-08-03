import { CheckerIcon } from "./CheckerIcon";

export function Footer() {
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
          Cada lugar fue verificado antes de sumarse a la lista. Cuando existe
          una fuente real — Time Out, un influencer, TV o un viral — va
          linkeada. Si no, se incluye igual pero sin inventar nada.
        </p>
      </div>
    </footer>
  );
}
