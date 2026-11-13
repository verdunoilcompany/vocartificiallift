/**
 * iisnode entry point for the Next.js standalone build.
 *
 * The generated .next/standalone/server.js parses PORT as a number, but iisnode passes a
 * named pipe (\\.\pipe\...) in PORT. This wrapper boots the same Next server and listens
 * on whatever PORT iisnode provides. It is copied next to server.js by
 * scripts/prepare-standalone.mjs.
 */
const http = require("http");
const path = require("path");

process.env.NODE_ENV = "production";
process.chdir(__dirname);

const { config } = require(path.join(__dirname, ".next", "required-server-files.json"));
process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(config);

// The public custom-server API includes Next's router (static files, basePath handling).
const next = require("next");

const app = next({
  dir: __dirname,
  dev: false,
  conf: config,
  hostname: "localhost",
  port: 0,
});
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    http.createServer((req, res) => handle(req, res)).listen(process.env.PORT || 3000);
  })
  .catch((err) => {
    console.error("Failed to start Next.js under iisnode:", err);
    process.exit(1);
  });
