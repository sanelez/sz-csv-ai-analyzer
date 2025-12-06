/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
    // Output mode: "export" for GitHub Pages, "standalone" for Docker self-hosting
    // Set NEXT_OUTPUT_MODE=standalone for Docker builds
    output: process.env.NEXT_OUTPUT_MODE === "standalone" ? "standalone" : "export",

    // Base path for GitHub Pages (repository name)
    // Set via NEXT_PUBLIC_BASE_PATH env var in GitHub Actions
    basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",

    // Disable image optimization for static export
    images: {
        unoptimized: true,
    },

    // Trailing slash for GitHub Pages compatibility (only in export mode)
    trailingSlash: process.env.NEXT_OUTPUT_MODE !== "standalone",
};

export default config;
