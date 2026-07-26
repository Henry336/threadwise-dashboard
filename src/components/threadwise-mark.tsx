export function ThreadwiseMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand-lockup" aria-label="Threadwise">
      <ThreadwiseGlyph className="brand-mark" />
      {!compact && <span>threadwise</span>}
    </span>
  );
}

export function ThreadwiseGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 116"
      role="img"
      aria-label="Threadwise"
      fill="none"
    >
      <path
        d="M50 10C30.8 10 18 24.3 18 43.2c0 17.1 11.2 27.9 32 39.7 20.8-11.8 32-22.6 32-39.7C82 24.3 69.2 10 50 10Z"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M50 82.9c-15.4-7.7-26.3.2-25.1 11.9 1.1 10.6 14.8 14 25.1 4.3 9-8.4 7.2-16.9 0-16.2-6.2.6-7.6 8.5-1.9 14.1l10 9.8 27.4-22.9"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TelegramGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M21.8 3.2 2.9 10.5c-1.3.5-1.3 1.2-.2 1.5l4.8 1.5 1.8 5.6c.2.6.1.8.7.8.5 0 .7-.2 1-.5l2.3-2.2 4.8 3.5c.9.5 1.5.2 1.7-.8L23 4.7c.3-1.3-.5-1.9-1.2-1.5ZM9.4 13.2l9.3-5.8c.5-.3.9-.1.5.2l-7.7 6.9-.3 3.2-1.8-4.5Z"
      />
    </svg>
  );
}
