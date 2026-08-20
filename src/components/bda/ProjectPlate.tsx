import type { BrandCategory } from "@/types/bda";
import { initials } from "@/lib/bda/text";

const gradient: Record<BrandCategory, string> = {
  moda: "linear-gradient(135deg, rgba(161,80,58,0.28), rgba(161,80,58,0.06))",
  servicios:
    "linear-gradient(135deg, rgba(63,101,119,0.28), rgba(63,101,119,0.06))",
  lifestyle:
    "linear-gradient(135deg, rgba(92,106,60,0.28), rgba(92,106,60,0.06))",
};

export default function ProjectPlate({
  name,
  category,
  rounded = "rounded-t-2xl",
  className = "",
}: {
  name: string;
  category: BrandCategory;
  rounded?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex aspect-[16/10] items-center justify-center ${rounded} ${className}`}
      style={{ background: gradient[category] }}
    >
      <span className="bda-serif text-4xl text-bda-ink/60">
        {initials(name)}
      </span>
    </div>
  );
}
