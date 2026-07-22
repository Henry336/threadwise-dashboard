export function ThreadwiseMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand-lockup" aria-label="Threadwise">
      <svg className="brand-mark" viewBox="0 0 64 64" aria-hidden="true">
        <path
          className="brand-mark-loop"
          d="M32 8C18.6 8 10 17.4 10 30.2c0 10.5 7.1 16.1 16.4 21.6L32 55l5.6-3.2C46.9 46.3 54 40.7 54 30.2 54 17.4 45.4 8 32 8Z"
        />
        <path
          className="brand-mark-thread"
          d="M32 55c-6.4-7.5-16.4-8.8-19.3-3.6-2.6 4.8 4.8 9.2 11.1 5.8 5.4-2.9 9.3-9.8 14.5-12.8 5.4-3.1 10.6-.3 10.6 4.2 0 4-4.2 6.5-8.6 5.7M39.7 54.2l6.2 5.1L58 42.1"
        />
      </svg>
      {!compact && <span>threadwise</span>}
    </span>
  );
}
