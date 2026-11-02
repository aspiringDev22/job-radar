import type { JobLocation } from "../lib/listing";

export function JobLocations({ locations }: { locations: JobLocation[] }) {
  if (locations.length < 2) {
    return null;
  }

  return (
    <ul className="mt-5 flex flex-col gap-2">
      {locations.map((location) => (
        <li
          key={location.slug}
          className="flex items-center justify-between gap-4 rounded-xl border bg-card px-3 py-2 text-sm"
        >
          <span>{location.label}</span>
          {location.applyUrl ? (
            <a
              href={location.applyUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 shrink-0 items-center rounded-full bg-signal px-3.5 font-medium text-signal-foreground transition-[filter] hover:brightness-110"
            >
              Apply
            </a>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
