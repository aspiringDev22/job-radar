"use client";

import { useActionState } from "react";

import { cn } from "@/shared/lib/utils";

import { NOTE_MAX } from "../lib/suggestion";
import { suggestCompany } from "../server/suggest-company";
import type { SuggestState } from "../types";

const initialState: SuggestState = { status: "idle", message: "" };

const fieldClass = "w-full rounded-xl border bg-background px-4 py-2 text-sm outline-none focus-visible:border-ring";

export function SuggestCompanyForm() {
  const [state, formAction, pending] = useActionState(suggestCompany, initialState);

  return (
    <form action={formAction} className="mt-8 max-w-xl space-y-5">
      <div>
        <label htmlFor="suggest-url" className="text-sm font-medium">
          Company website or careers page
        </label>
        <input
          id="suggest-url"
          name="url"
          type="text"
          inputMode="url"
          autoComplete="url"
          required
          maxLength={300}
          placeholder="acme.com/careers"
          className={cn(fieldClass, "mt-2 h-10")}
        />
      </div>
      <div>
        <label htmlFor="suggest-note" className="text-sm font-medium">
          Anything that helps us find their roles <span className="text-muted-foreground">(optional)</span>
        </label>
        <textarea id="suggest-note" name="note" rows={3} maxLength={NOTE_MAX} className={cn(fieldClass, "mt-2")} />
      </div>
      <div aria-hidden="true" className="hidden">
        <label>
          Leave this empty
          <input name="company_fax" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="h-9 rounded-full bg-foreground px-4 text-sm text-background disabled:opacity-60"
        >
          {pending ? "Sending…" : "Suggest company"}
        </button>
        <p
          aria-live="polite"
          className={cn("text-sm", state.status === "error" ? "text-destructive" : "text-muted-foreground")}
        >
          {state.message}
        </p>
      </div>
    </form>
  );
}
