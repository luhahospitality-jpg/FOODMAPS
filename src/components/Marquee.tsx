import { CheckerIcon } from "./CheckerIcon";

export function Marquee({
  text,
  tone = "ink",
}: {
  text: string;
  tone?: "ink" | "mustard";
}) {
  const bg = tone === "ink" ? "bg-ink text-paper" : "bg-mustard text-ink";
  const items = Array.from({ length: 8 });

  return (
    <div className={`overflow-hidden border-y-2 border-ink py-2.5 ${bg}`}>
      <div className="marquee-track flex w-max items-center">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex items-center">
            {items.map((_, i) => (
              <span
                key={i}
                className="flex items-center gap-3 px-4 font-label text-xs font-bold tracking-widest uppercase"
              >
                {text}
                <CheckerIcon size={12} />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
