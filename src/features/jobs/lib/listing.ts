export type ListingMember = {
  slug: string;
  dedupeKey: string | null;
  city: string | null;
  location: string | null;
  isRemote: boolean;
  postedAt: Date | null;
  applyUrl: string | null;
};

export type ListingGroup<T extends ListingMember> = {
  representative: T;
  locationCount: number;
  members: T[];
};

export type JobLocation = {
  label: string;
  applyUrl: string | null;
  slug: string;
};

export function placeLabel(city: string | null, location: string | null, isRemote: boolean): string {
  if (city) {
    return city;
  }
  if (location) {
    return location;
  }
  if (isRemote) {
    return "Remote";
  }
  return "Location not listed";
}

export function listPlaceLabel(job: {
  locationCount: number;
  isRemote: boolean;
  location: string | null;
}): string {
  if (job.locationCount > 1) {
    return `${job.locationCount} locations`;
  }
  if (job.isRemote) {
    return "Remote";
  }
  return job.location ?? "Location not listed";
}

function postedTime(value: Date | null): number {
  return value?.getTime() ?? Number.NEGATIVE_INFINITY;
}

function comparePostedDesc(left: ListingMember, right: ListingMember): number {
  return postedTime(right.postedAt) - postedTime(left.postedAt);
}

export function groupListings<T extends ListingMember>(rows: T[]): ListingGroup<T>[] {
  const buckets = new Map<string, T[]>();
  for (const row of rows) {
    const key = row.dedupeKey ?? `slug:${row.slug}`;
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push(row);
    } else {
      buckets.set(key, [row]);
    }
  }

  const groups: ListingGroup<T>[] = [];
  for (const members of buckets.values()) {
    const places = new Set(members.map((member) => placeLabel(member.city, member.location, member.isRemote)));
    if (places.size >= 2) {
      const ordered = [...members].sort(comparePostedDesc);
      const representative = ordered[0];
      if (representative) {
        groups.push({ representative, locationCount: places.size, members: ordered });
      }
    } else {
      for (const member of members) {
        groups.push({ representative: member, locationCount: 1, members: [member] });
      }
    }
  }

  groups.sort((left, right) => comparePostedDesc(left.representative, right.representative));
  return groups;
}

export function postingLocations(members: ListingMember[]): JobLocation[] {
  const seen = new Set<string>();
  const locations: JobLocation[] = [];
  for (const member of [...members].sort(comparePostedDesc)) {
    const label = placeLabel(member.city, member.location, member.isRemote);
    if (seen.has(label)) {
      continue;
    }
    seen.add(label);
    locations.push({ label, applyUrl: member.applyUrl, slug: member.slug });
  }
  locations.sort((left, right) => left.label.localeCompare(right.label, "en"));
  return locations;
}
