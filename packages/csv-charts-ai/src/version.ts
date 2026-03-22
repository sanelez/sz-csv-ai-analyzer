// Read version from package.json at build time (inlined by tsup)
import pkg from "../package.json" with { type: "json" };
export const VERSION: string = pkg.version;
