/* Brand artwork is a static same-origin SVG and does not need Next image optimization. */
/* eslint-disable @next/next/no-img-element */

type AriVariant = "avatar-light" | "avatar-dark" | "full";

const ARI_SOURCES: Record<AriVariant, string> = {
  "avatar-light": "/brand/ari-avatar-light.svg",
  "avatar-dark": "/brand/ari-avatar-dark.svg",
  full: "/brand/ari-full.svg",
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
