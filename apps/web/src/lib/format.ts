export function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
  }).format(cents / 100);
}

export function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const hours = Math.floor(min / 60);
  const mins = min % 60;
  return mins ? `${hours} h ${mins} min` : `${hours} h`;
}

export function formatTime(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-MY", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function formatDate(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-MY", {
    timeZone: timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(iso));
}
