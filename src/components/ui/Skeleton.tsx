type SkeletonRounded = "sm" | "md" | "lg" | "full";
type SkeletonVariant = "sweep" | "wave";

interface SkeletonProps {
  width?: string;
  height?: string;
  rounded?: SkeletonRounded;
  /** "sweep": a highlight sweeping on a loop (loading a standalone block).
   *  "wave": pulses between surface and accent tint — pair with `delayMs`
   *  across a sequence (e.g. a timeline) so the glow travels down the list. */
  variant?: SkeletonVariant;
  delayMs?: number;
  className?: string;
}

const ROUNDED_CLASS: Record<SkeletonRounded, string> = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  full: "rounded-full",
};

export default function Skeleton({
  width,
  height = "1em",
  rounded = "sm",
  variant = "sweep",
  delayMs,
  className = "",
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`sk sk-${variant} ${ROUNDED_CLASS[rounded]} ${className}`}
      style={{
        width,
        height,
        animationDelay: delayMs !== undefined ? `${delayMs}ms` : undefined,
      }}
    />
  );
}
