export function ThreadwiseMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand-lockup" aria-label="Threadwise">
      <svg className="brand-mark" viewBox="0 0 36 36" aria-hidden="true">
        <path d="M7 9.5h13.5c5.25 0 8.5 2.8 8.5 7.3s-3.25 7.2-8.5 7.2H15" />
        <path d="M7 16.8h12.2c3 0 4.7 1.15 4.7 3.45 0 2.3-1.7 3.45-4.7 3.45H7" />
        <circle cx="7" cy="9.5" r="2.3" />
        <circle cx="7" cy="23.7" r="2.3" />
      </svg>
      {!compact && <span>threadwise</span>}
    </span>
  );
}
