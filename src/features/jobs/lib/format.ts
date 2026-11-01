export function postedAgo(date: Date | null, now = new Date()): string {
  if (!date) {
    return "date unknown";
  }
  const days = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (days <= 0) {
    return "newest today";
  }
  if (days === 1) {
    return "newest yesterday";
  }
  if (days < 30) {
    return `newest ${days} days ago`;
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function sourceLabel(source: string): string {
  if (source === "greenhouse") {
    return "Greenhouse";
  }
  if (source === "lever") {
    return "Lever";
  }
  if (source === "ashby") {
    return "Ashby";
  }
  if (source === "workable") {
    return "Workable";
  }
  if (source === "smartrecruiters") {
    return "SmartRecruiters";
  }
  if (source === "recruitee") {
    return "Recruitee";
  }
  if (source === "workday") {
    return "Workday";
  }
  if (source === "amazon") {
    return "Amazon";
  }
  if (source === "keka") {
    return "Keka";
  }
  return source;
}

const CURRENCY_SYMBOLS: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };

export function formatSalary(
  min: number | null,
  max: number | null,
  currency: string | null,
): string | null {
  if (min == null || max == null) {
    return null;
  }
  // No conversion: each range is shown in the currency it was published in.
  // A currency without a symbol is named once, in front: "CAD 120k–150k".
  const symbol = currency ? (CURRENCY_SYMBOLS[currency] ?? "") : "";
  const prefix = currency && !symbol ? `${currency} ` : "";
  const compact = (value: number) => {
    if (currency === "INR" && value >= 100000) {
      const lakhs = value / 100000;
      const rounded = Number.isInteger(lakhs) ? String(lakhs) : lakhs.toFixed(1);
      return `${symbol}${rounded}L`;
    }
    return value >= 1000 ? `${symbol}${Math.round(value / 1000)}k` : `${symbol}${value}`;
  };
  return `${prefix}${compact(min)}–${compact(max)}`;
}
