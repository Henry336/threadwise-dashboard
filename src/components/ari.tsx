/* Brand artwork is a static same-origin PNG and does not need Next image optimization. */
/* eslint-disable @next/next/no-img-element */

/**
 * Ari, the Threadwise mascot: static artwork variants and the "untangling" loading indicator.
 * Images live under `public/brand/`. Used by the landing, dashboard, offline and loading pages.
 */
export type AriVariant =
  | "avatar-light"
  | "avatar-dark"
  | "full"
  | "threading"
  | "mark";

const ARI_SOURCES: Record<AriVariant, string> = {
  "avatar-light": "/brand/ari-avatar-light-transparent-v2.webp",
  "avatar-dark": "/brand/ari-avatar-dark-transparent-v2.webp",
  full: "/brand/ari-full-sheet.png",
  threading: "/brand/ari-threading-sheet.png",
  mark: "/brand/threadwise-mark-sheet.png",
};

/** One Ari image. Set `decorative` when nearby text already says it, so screen readers skip it. */
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

/**
 * Animated Ari loader with a text label. It is a polite live region, so screen readers
 * announce the label. The motion itself is CSS on `.ari-untangle-loader-frame`.
 */
export function AriUntangleLoader({
  label = "Untangling your threads…",
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  return (
    <div className={`ari-untangle-loader${compact ? " compact" : ""}`} role="status" aria-live="polite">
      <span className="ari-untangle-loader-frame" aria-hidden="true">
        <img src="/brand/ari-untangle-calm-v6.webp" alt="" />
      </span>
      <span>{label}</span>
    </div>
  );
}

/** Full-page loader shown while a workspace route loads (`app/dashboard/loading.tsx`, Study). */
export function AriWorkspaceLoader() {
  return (
    <main className="tw-route-loading">
      <AriUntangleLoader label="Untangling your workspace…" />
    </main>
  );
}
