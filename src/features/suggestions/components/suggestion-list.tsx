import { loadSuggestions, type SuggestionRow } from "../server/load-suggestions";

function when(date: Date): string {
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

function Row({ suggestion }: { suggestion: SuggestionRow }) {
  return (
    <tr className="border-t align-top">
      <td className="py-3 pr-4">
        <a
          href={suggestion.url}
          target="_blank"
          rel="noreferrer nofollow"
          className="font-medium underline-offset-4 hover:underline"
        >
          {suggestion.host}
        </a>
        {suggestion.note ? <p className="mt-1 text-xs text-muted-foreground">{suggestion.note}</p> : null}
      </td>
      <td className="py-3 pr-4 capitalize">{suggestion.status}</td>
      <td className="py-3 pr-4 tabular-nums">{suggestion.timesSuggested}</td>
      <td className="py-3 whitespace-nowrap">{when(suggestion.lastSuggestedAt)}</td>
    </tr>
  );
}

export async function SuggestionList() {
  const suggestions = await loadSuggestions();
  const fresh = suggestions.filter((suggestion) => suggestion.status === "new").length;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <p className="text-sm text-muted-foreground">Internal</p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">Company suggestions</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
        {suggestions.length} suggested · {fresh} new. To review one, add it to data/seed-domains.csv and run pnpm
        discover --only with its name. Copy a confirmed feed into data/companies.json, then set its status to added or
        rejected in the database. Times are IST.
      </p>
      {suggestions.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No suggestions yet.</p>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="pb-2 pr-4 font-normal">Site</th>
                <th className="pb-2 pr-4 font-normal">Status</th>
                <th className="pb-2 pr-4 font-normal">Times</th>
                <th className="pb-2 font-normal">Last suggested</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((suggestion) => (
                <Row key={suggestion.id} suggestion={suggestion} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
