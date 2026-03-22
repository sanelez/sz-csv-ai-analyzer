import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
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
    "ai",
    "zod",
    "@ai-sdk/openai",
    "@ai-sdk/anthropic",
    "@ai-sdk/google",
    "@ai-sdk/mistral",
  ],
});
