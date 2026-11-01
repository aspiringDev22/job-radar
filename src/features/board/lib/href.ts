export function boardHref(input: {
  company?: string | null;
  job?: string | null;
  q?: string | null;
  location?: string | null;
  remote?: boolean;
  seniority?: string | null;
  source?: string | null;
  posted?: number | null;
  worldwide?: boolean;
  operations?: boolean;
}): string {
  const params = new URLSearchParams();
  if (input.q) {
    params.set("q", input.q);
  }
  if (input.location) {
    params.set("location", input.location);
  }
  if (input.remote) {
    params.set("remote", "1");
  }
  if (input.seniority) {
    params.set("seniority", input.seniority);
  }
  if (input.source) {
    params.set("source", input.source);
  }
  if (input.posted) {
    params.set("posted", String(input.posted));
  }
  if (input.worldwide) {
    params.set("worldwide", "1");
  }
  if (input.operations) {
    params.set("ops", "1");
  }
  if (input.company) {
    params.set("company", input.company);
  }
  if (input.job) {
    params.set("job", input.job);
  }
  const query = params.toString();
  return query.length > 0 ? `/?${query}` : "/";
}
