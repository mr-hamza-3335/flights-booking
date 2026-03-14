export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatDateTime(isoString: string): { date: string; time: string } {
  const dt = new Date(isoString);
  return {
    date: dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    time: dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
  };
}

export function getCabinLabel(cabin: string): string {
  const labels: Record<string, string> = {
    economy: "Economy",
    premium_economy: "Premium Economy",
    business: "Business",
    first: "First Class",
  };
  return labels[cabin] || cabin;
}

export function getStopsLabel(stops: number): string {
  if (stops === 0) return "Direct";
  if (stops === 1) return "1 Stop";
  return `${stops} Stops`;
}

export function generatePassengerLabel(adults: number, children: number, infants: number): string {
  const parts: string[] = [];
  if (adults > 0) parts.push(`${adults} ${adults === 1 ? "Adult" : "Adults"}`);
  if (children > 0) parts.push(`${children} ${children === 1 ? "Child" : "Children"}`);
  if (infants > 0) parts.push(`${infants} ${infants === 1 ? "Infant" : "Infants"}`);
  return parts.join(", ");
}

export function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}
