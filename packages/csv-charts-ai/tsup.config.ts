import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    charts: "src/charts.ts",
  },
  format: ["esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    "react",
    "react-dom",
    "recharts",
    "lucide-react",
    "@ai-sdk/openai",
    "@ai-sdk/anthropic",
    "@ai-sdk/google",
    "@ai-sdk/mistral",
  ],
});
