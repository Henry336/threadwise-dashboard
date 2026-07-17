export function ThreadwiseMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand-lockup" aria-label="Threadwise">
      <svg className="brand-mark" viewBox="0 0 40 40" aria-hidden="true">
        <path className="brand-mark-orbit" d="M31.7 21.2c0 7.4-5.8 13.1-13.2 13.1-5 0-9.3-2.7-11.6-6.7" />
        <path className="brand-mark-thread" d="M6.9 27.6c3.6-1.7 7.1-1.2 10.2.6 2.7 1.6 5.1 1.7 7.2.2" />
        <path className="brand-mark-needle" d="M11.6 25.8 29.7 8.2c1.1-1.1 2.8-1.1 3.9 0 1.1 1.1 1.1 2.8 0 3.9L15.8 29.7" />
        <circle className="brand-mark-eye" cx="30.8" cy="11" r="1.25" />
      </svg>
      {!compact && <span>threadwise</span>}
    </span>
  );
}
