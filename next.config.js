/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

/** @type {import("next").NextConfig} */
const config = {
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  // Output mode: "export" for GitHub Pages, "standalone" for Docker self-hosting
  // Set NEXT_OUTPUT_MODE=standalone for Docker builds
  output:
    process.env.NEXT_OUTPUT_MODE === "standalone" ? "standalone" : "export",

  // Base path for GitHub Pages (repository name)
  // Set via NEXT_PUBLIC_BASE_PATH env var in GitHub Actions
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",

  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },

  reactCompiler: true,

  // Always use trailing slash for GitHub Pages compatibility
  trailingSlash: true,

  
   // Handle redirects for GitHub Pages
  async redirects() {
    return [];
  },
  
  // Handle rewrites for GitHub Pages SPA routing
  async rewrites() {
    return [
      {
        source: '/:path*',
        destination: '/index.html',
      },
    ];
  },
};

export default config;
