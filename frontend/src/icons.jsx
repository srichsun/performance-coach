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

export function MicIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="6" y="1.6" width="4" height="8" rx="2" fill="currentColor" />
      <path
        d="M3.6 7.4a4.4 4.4 0 0 0 8.8 0M8 11.8V14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

// The affordance on a folded day: which way is it about to move.
export function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M3.6 5.3 L7 8.7 L10.4 5.3" fill="none" stroke="currentColor"
            strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
