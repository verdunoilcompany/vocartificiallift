// Runs after `next build`. Makes .next/standalone a self-contained IIS deployment folder:
// static assets, public files, sample data, web.config and the iisnode entry point.
import { cpSync, existsSync } from "fs";
import { join } from "path";

const root = process.cwd();
const out = join(root, ".next", "standalone");

if (!existsSync(join(out, "server.js"))) {
  console.error("prepare-standalone: .next/standalone/server.js not found. Is output: 'standalone' set?");
  process.exit(1);
}

const copies = [
  [join(root, ".next", "static"), join(out, ".next", "static")],
  [join(root, "public"), join(out, "public")],
  [join(root, "db"), join(out, "db")],
  [join(root, "web.config"), join(out, "web.config")],
  [join(root, "iis", "iisnode.js"), join(out, "iisnode.js")],
];

for (const [from, to] of copies) {
  if (!existsSync(from)) continue;
  cpSync(from, to, { recursive: true });
  console.log(`prepare-standalone: ${from.replace(root, ".")} -> ${to.replace(root, ".")}`);
}
console.log("prepare-standalone: deploy .next/standalone as the IIS application folder.");
