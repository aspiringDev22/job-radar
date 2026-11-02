function roleCount(count: number, adjective: string): string {
  return `${count.toLocaleString("en-IN")} ${adjective}${count === 1 ? "role" : "roles"}`;
}

// "142 roles at Freshworks" when a company is picked, otherwise the whole board.
// Every count follows the active filters and scope toggles.
export function headline(input: {
  totalRoles: number;
  companyCount: number;
  filtered: boolean;
  company: { name: string; openRoles: number } | null;
}): string {
  if (input.company) {
    const roles = roleCount(input.company.openRoles, input.filtered ? "matching " : "");
    return `${roles} at ${input.company.name}, read from its own careers page.`;
  }
  const roles = roleCount(input.totalRoles, input.filtered ? "matching " : "live ");
  const companies = `${input.companyCount} ${input.companyCount === 1 ? "company" : "companies"}`;
  return `${roles} across ${companies}, read from their own career pages.`;
}

// "51–100 of 3,027 roles" above the list, or just the count when it fits on one page.
export function rangeLabel(input: { page: number; pageSize: number; total: number }): string {
  const count = (value: number) => value.toLocaleString("en-IN");
  const noun = input.total === 1 ? "role" : "roles";
  if (input.total <= input.pageSize) {
    return `${count(input.total)} ${noun}`;
  }
  const from = (input.page - 1) * input.pageSize + 1;
  const to = Math.min(input.page * input.pageSize, input.total);
  return `${count(from)}–${count(to)} of ${count(input.total)} ${noun}`;
}

// Under the result count when a search leaves out roles that match only in their descriptions.
export function descriptionMatchesLabel(count: number): string {
  const roles = `${count.toLocaleString("en-IN")} more ${count === 1 ? "role mentions" : "roles mention"}`;
  return `${roles} your search only in the description.`;
}

// "updated 2 hours ago", for the live badge above the board.
export function syncedAgo(date: Date | null, now = new Date()): string {
  if (!date) {
    return "not synced yet";
  }
  const minutes = Math.max(0, Math.round((now.getTime() - date.getTime()) / 60_000));
  if (minutes < 1) {
    return "updated just now";
  }
  if (minutes < 60) {
    return `updated ${minutes} min ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `updated ${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }
  const days = Math.round(hours / 24);
  return `updated ${days} ${days === 1 ? "day" : "days"} ago`;
}
