// How an energy rating looks, in one place.
//
// It's rated 1-10 and shown as a percentage. Ten steps, not a hundred: nobody
// can tell their own 67 from their 71, and a finer scale would only make the
// chart look precise while meaning less.
//
// The three colours are muted on purpose. A screen you open on your worst day
// shouldn't shout at you in traffic-light red — clay, honey and sage carry the
// same three readings without the alarm.

export const BANDS = [
  { max: 3, color: "#c08578", light: "#f0e2dd", label: "Low" },
  { max: 6, color: "#c9a05c", light: "#f3ead9", label: "Steady" },
  { max: 10, color: "#7f9d80", light: "#e3ece2", label: "Good" },
];

export const UNRATED = "#d9d3c9";

export function bandFor(score) {
  return BANDS.find((b) => score <= b.max) || BANDS[BANDS.length - 1];
}

export function colorFor(score) {
  return score ? bandFor(score).color : UNRATED;
}

export function percentFor(score) {
  return score ? score * 10 : null;
}

// "19 Jul" — reads as a date rather than a coordinate.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function longDay(iso) {
  const [, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]}`;
}

// "7/19" — short enough for an axis tick on a phone.
export function shortDay(iso) {
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
}
