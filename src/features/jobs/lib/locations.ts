export const LOCATION_GROUPS = [
  { id: "bengaluru", label: "Bengaluru", terms: ["bengaluru", "bangalore"] },
  { id: "hyderabad", label: "Hyderabad", terms: ["hyderabad"] },
  { id: "mumbai", label: "Mumbai", terms: ["mumbai"] },
  { id: "pune", label: "Pune", terms: ["pune"] },
  { id: "chennai", label: "Chennai", terms: ["chennai"] },
  {
    id: "delhi-ncr",
    label: "Delhi NCR",
    terms: ["delhi", "gurgaon", "gurugram", "noida", "ncr", "ghaziabad", "faridabad"],
  },
  {
    id: "india",
    label: "India",
    terms: [
      "india",
      "bengaluru",
      "bangalore",
      "hyderabad",
      "mumbai",
      "pune",
      "chennai",
      "delhi",
      "gurgaon",
      "gurugram",
      "noida",
      "ncr",
      "ghaziabad",
      "faridabad",
      "kolkata",
      "ahmedabad",
      "jaipur",
      "kochi",
      "chandigarh",
      "indore",
      "coimbatore",
      "thiruvananthapuram",
      "trivandrum",
    ],
  },
] as const;

export function locationTerms(input: string): string[] {
  const key = input.trim().toLowerCase();
  const named = LOCATION_GROUPS.find(
    (group) => group.id === key || group.label.toLowerCase() === key,
  );
  if (named) {
    return [...named.terms];
  }
  const exact = LOCATION_GROUPS.filter((group) =>
    group.terms.some((term) => term === key),
  ).sort((a, b) => a.terms.length - b.terms.length)[0];
  return exact ? [...exact.terms] : [input.trim()];
}

export function activeLocationId(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const key = value.trim().toLowerCase();
  const named = LOCATION_GROUPS.find(
    (group) => group.id === key || group.label.toLowerCase() === key,
  );
  if (named) {
    return named.id;
  }
  const exact = LOCATION_GROUPS.filter((group) =>
    group.terms.some((term) => term === key),
  ).sort((a, b) => a.terms.length - b.terms.length)[0];
  return exact?.id ?? null;
}

export function locationInIndia(location: string | null): boolean {
  if (!location) {
    return false;
  }
  const haystack = location.toLowerCase();
  return LOCATION_GROUPS.find((group) => group.id === "india")?.terms.some((term) =>
    haystack.includes(term),
  ) ?? false;
}
