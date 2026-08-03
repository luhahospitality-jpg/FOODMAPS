export function CheckerIcon({
  className = "",
  size = 24,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect x="0" y="0" width="12" height="12" fill="currentColor" />
      <rect x="12" y="12" width="12" height="12" fill="currentColor" />
    </svg>
  );
}
