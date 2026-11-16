/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/dynocard";

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
    "/api/cards/default-predictions": ["./db/**/*"],
    // exceljs → … → async-function / generator-function expose a `require.mjs` entry
    // (used on Node 22+) that the tracer misses.
    "/api/cards/upload": [
      "./node_modules/async-function/**/*",
      "./node_modules/generator-function/**/*",
    ],
  },
  // msnodesqlv8 is a native (ODBC) module used for Windows authentication to SQL Server.
  serverExternalPackages: ["exceljs", "mssql", "msnodesqlv8", "pg"],
};
