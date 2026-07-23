/* Brand artwork is a static same-origin PNG and does not need Next image optimization. */
/* eslint-disable @next/next/no-img-element */

export type AriVariant =
  | "avatar-light"
  | "avatar-dark"
  | "full"
  | "threading"
  | "mark";

const ARI_SOURCES: Record<AriVariant, string> = {
  "avatar-light": "/brand/ari-avatar-light-sheet.png",
  "avatar-dark": "/brand/ari-avatar-dark-sheet.png",
  full: "/brand/ari-full-sheet.png",
  threading: "/brand/ari-threading-sheet.png",
  mark: "/brand/threadwise-mark-sheet.png",
};

export function Ari({
  variant = "full",
  className,
  decorative = false,
}: {
  variant?: AriVariant;
  className?: string;
  decorative?: boolean;
}) {
  return (
    <img
      className={className}
      src={ARI_SOURCES[variant]}
      alt={decorative ? "" : "Ari, the Threadwise mascot"}
      aria-hidden={decorative || undefined}
    />
  );
}
