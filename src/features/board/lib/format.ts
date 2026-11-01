export function updatedLabel(date: Date | null): string {
  if (!date) {
    return "Not synced yet.";
  }
  const formatted = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return `Updated ${formatted}.`;
}

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
