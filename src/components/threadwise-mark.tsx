export function ThreadwiseMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand-lockup" aria-label="Threadwise">
      <svg className="brand-mark" viewBox="0 0 64 64" aria-hidden="true">
        <circle className="brand-mark-bg" cx="32" cy="32" r="31" />
        <circle className="brand-mark-ring" cx="32" cy="30.5" r="20.5" />
        <path className="brand-mark-arc" d="M18.8 31.8a14.3 14.3 0 0 1 8.3-13.1M43.9 38.6a14.4 14.4 0 0 1-6.7 5.3" />
        <path className="brand-mark-check" d="m18.7 35.3 8.1 8.2 18.1-24" />
        <path className="brand-mark-needle" d="m31.6 35.4 15.7-18.9-10.8 22.3Z" />
        <circle className="brand-mark-hub" cx="33.4" cy="34.4" r="4.5" />
        <circle className="brand-mark-eye" cx="33.4" cy="34.4" r="2.1" />
        <path className="brand-mark-thread" d="M16.6 45.4c5.6-3 11-1.6 15.9 1.1 4.6 2.5 9.6 2.1 14.9-1.5-2.2 5.2-7.1 8.3-14.5 8.3-8.4 0-14.1-2.4-17.2-5.3-.9-.9-.5-2 .9-2.6Z" />
      </svg>
      {!compact && <span>threadwise</span>}
    </span>
  );
}
