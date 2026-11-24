/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/als";

module.exports = {
  output: "standalone", // required for iisnode deployment
  basePath,
  assetPrefix: basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  // Flat data files in /db are read at runtime by the API routes; make sure the
  // standalone output traces them.
  outputFileTracingIncludes: {
    "/api/cards": ["./db/**/*"],
    "/api/model": ["./db/**/*"],
    // exceljs → … → async-function / generator-function expose a `require.mjs` entry
    // (used on Node 22+) that the tracer misses.
    "/api/cards/upload": [
      "./node_modules/async-function/**/*",
      "./node_modules/generator-function/**/*",
    ],
  },
  serverExternalPackages: ["exceljs", "mssql", "pg"],
  // Old page addresses (bookmarks, shared links) keep working; the query string is carried over.
  async redirects() {
    return [
      { source: "/classifier", destination: "/dynocard-classifier", permanent: false },
      { source: "/explorer", destination: "/dynocard-explorer", permanent: false },
      { source: "/daily", destination: "/daily-dashboard", permanent: false },
      { source: "/trends", destination: "/trend-analysis", permanent: false },
      { source: "/setpoints", destination: "/setpoint-report", permanent: false },
      { source: "/morning-report", destination: "/morning-reports", permanent: false },
    ];
  },
};
