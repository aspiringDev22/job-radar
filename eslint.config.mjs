import { readdirSync } from "node:fs";

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Architecture boundaries. See docs/architecture.md.
const FEATURES = readdirSync(new URL("./src/features", import.meta.url), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

// The only files of a feature that code outside it may import.
const PUBLIC_ENTRIES = ["index", "schema", "server", "components"].map(
  (entry) => `**/src/features/*/${entry}.ts`,
);
const PUBLIC_ENTRY_MESSAGE =
  "Import a feature through its public entry (index, schema, server or components), not its internals.";

const boundaries = {
  files: ["src/**/*.{ts,tsx}"],
  rules: {
    "import/no-restricted-paths": [
      "error",
      {
        zones: [
          {
            target: "./src/shared/**/*",
            from: ["./src/features/**/*", "./src/app/**/*"],
            message: "shared/ is feature-agnostic and must not import features or routes.",
          },
          {
            target: "./src/features/**/*",
            from: "./src/app/**/*",
            message: "Features must not import routes.",
          },
          {
            target: ["./src/app/**/*", "./src/proxy.ts"],
            from: "./src/features/**/*",
            except: PUBLIC_ENTRIES,
            message: PUBLIC_ENTRY_MESSAGE,
          },
          ...FEATURES.map((feature) => ({
            target: `./src/features/${feature}/**/*`,
            from: `./src/features/!(${feature})/**/*`,
            except: PUBLIC_ENTRIES,
            message: PUBLIC_ENTRY_MESSAGE,
          })),
        ],
      },
    ],
  },
};

// Files that Node scripts (pnpm sync, db:seed, test) load directly.
const nodeLoaded = {
  files: [
    "src/features/*/{index,schema,constants,types}.ts",
    "src/features/*/lib/**/*.ts",
    "src/features/ingestion/**/*.ts",
    "src/shared/db/**/*.ts",
    "src/shared/lib/**/*.ts",
  ],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["@/*"],
            message: "Node scripts load this file and do not resolve @/. Use a relative import with a .ts extension.",
          },
        ],
      },
    ],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  boundaries,
  nodeLoaded,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
