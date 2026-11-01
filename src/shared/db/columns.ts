import { customType } from "drizzle-orm/pg-core";

// Postgres full-text vector. Read-only in this app: columns of this type are generated.
export const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});
