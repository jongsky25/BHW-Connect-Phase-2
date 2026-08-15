import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Hosts that may only ever be contacted from src/lib/ai/providers/**.
// free-ai-leverage-plan.md §2: "A lint rule bans network calls to AI provider
// domains anywhere outside the adapter, so the gate cannot be bypassed by
// feature code." This is that rule — and the first project-authored lint rule
// in this repo, so there was no prior pattern to follow.
//
// Note the same doc's §5.5 claims the i18n "no hard-coded user-facing strings"
// rule is lint-enforced. It is not, and never has been; that remains an open
// commitment, not something this config addresses.
const AI_PROVIDER_HOSTS = [
  "generativelanguage.googleapis.com",
  "api.groq.com",
  "openrouter.ai",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),

  // Must come after the spreads above — in flat config, later objects win.
  {
    files: ["src/**/*.{ts,tsx}", "scripts/**/*.mjs"],
    ignores: ["src/lib/ai/providers/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...AI_PROVIDER_HOSTS.map((host) => ({
          // Matches a string literal anywhere containing the host, which
          // covers fetch(), a URL constant, or an SDK base-url option. Broad
          // on purpose: the gate is a DPA guarantee, so a false positive here
          // costs a code comment and a false negative costs the guarantee.
          selector: `Literal[value=/${host.replace(/\./g, "\\.")}/]`,
          message: `AI provider hosts may only appear in src/lib/ai/providers/. Route the call through callProvider() in src/lib/ai/adapter.ts so the data-classification gate cannot be bypassed.`,
        })),
      ],
    },
  },

  // The transport modules are reachable only from the adapter. Together with
  // the rule above this closes both routes: naming a host, and importing
  // something that already names one.
  {
    files: ["src/**/*.{ts,tsx}", "scripts/**/*.mjs"],
    // server.ts is the composition root — the one place a transport is wired
    // to the adapter. adapter.ts is listed because it owns the transport type.
    ignores: ["src/lib/ai/adapter.ts", "src/lib/ai/server.ts", "src/lib/ai/providers/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/lib/ai/providers/*", "./providers/*", "../providers/*"],
              message:
                "Import callProvider() from src/lib/ai/adapter.ts instead. Provider transports are deliberately unreachable from feature code so every external call passes the classification gate.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
