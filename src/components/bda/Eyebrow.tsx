export default function Eyebrow({
  children,
  className = "",
  markClassName = "",
}: {
  children: React.ReactNode;
  className?: string;
  markClassName?: string;
}) {
  return (
    <p className={`bda-mono inline-flex items-center gap-2 uppercase ${className}`}>
      <span className={`h-[6px] w-[6px] shrink-0 bg-bda-gold ${markClassName}`} aria-hidden="true" />
      {children}
    </p>
  );
}
