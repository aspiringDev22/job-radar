export function boardHref(input: {
  company?: string | null;
  job?: string | null;
  q?: string | null;
  location?: string | null;
  remote?: boolean;
  category?: string | null;
  seniority?: string | null;
  source?: string | null;
  posted?: number | null;
  worldwide?: boolean;
  operations?: boolean;
  descriptions?: boolean;
  page?: number | null;
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
  if (input.category) {
    params.set("role", input.category);
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
  if (input.descriptions) {
    params.set("desc", "1");
  }
  if (input.page && input.page > 1) {
    params.set("page", String(input.page));
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
