// Line icons, drawn rather than emoji so they inherit the text colour and keep
// the hairline weight the rest of the page uses.

export function PlayIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M4 2.6 L11.4 7 L4 11.4 Z" fill="currentColor" />
    </svg>
  );
}

export function StopIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true">
      <rect x="3.4" y="3" width="2.6" height="8" rx="0.9" fill="currentColor" />
      <rect x="8" y="3" width="2.6" height="8" rx="0.9" fill="currentColor" />
    </svg>
  );
}

export function WaitIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true">
      <circle cx="7" cy="7" r="5.4" fill="none" stroke="currentColor"
              strokeWidth="1.4" opacity="0.25" />
      <path d="M7 1.6 A5.4 5.4 0 0 1 12.4 7" fill="none" stroke="currentColor"
            strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
