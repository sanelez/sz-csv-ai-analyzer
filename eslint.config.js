import { FlatCompat } from "@eslint/eslintrc";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettierPlugin from "eslint-plugin-prettier";

// Intentionally avoid compat.extends on next/core-web-vitals — in some setups
// that shareable config creates circular structures. Keep a small, stable
// flat config that enables TypeScript plugin rules and uses the parser.
const compat = new FlatCompat({ baseDirectory: new URL("./", import.meta.url).pathname });

export default [
  // ignore built artifacts
  { ignores: [".next", "out", "node_modules"] },

  // TypeScript overrides and rule tweaks (parser+plugin set explicitly)
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    plugins: { "@typescript-eslint": tsPlugin, prettier: prettierPlugin },
    rules: {
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: { attributes: false } }],
      // Enforce Prettier formatting through ESLint
      "prettier/prettier": [
        "error",
        {
          endOfLine: "auto"
        }
      ],
    },
  },

  // Ensure Prettier config is applied by disabling conflicting rules
  ...compat.extends("prettier"),

  // global linter options
  { linterOptions: { reportUnusedDisableDirectives: true } },
];
