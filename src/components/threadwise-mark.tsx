import { Ari } from "./ari";

export function ThreadwiseMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand-lockup" aria-label="Threadwise">
      <span className="brand-mark-frame" aria-hidden="true">
        <Ari variant="mark" className="brand-mark brand-mark-light" decorative />
        <Ari variant="avatar-dark" className="brand-mark brand-mark-dark" decorative />
      </span>
      {!compact && <span>threadwise</span>}
    </span>
  );
}
