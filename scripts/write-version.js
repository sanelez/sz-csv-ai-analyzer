import { readFileSync, writeFileSync } from "fs";

const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
writeFileSync(
  "public/version.json",
  JSON.stringify({ version: pkg.version }) + "\n",
);
console.log(`Wrote public/version.json → ${pkg.version}`);
