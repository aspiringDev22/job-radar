"use client";

export default function BoardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-xl px-6 py-24 text-center">
      <h1 className="font-serif text-4xl tracking-tight">Something went wrong</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        The role list could not be loaded.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex h-9 items-center rounded-full bg-foreground px-4 text-sm text-background"
      >
        Try again
      </button>
    </main>
  );
}
