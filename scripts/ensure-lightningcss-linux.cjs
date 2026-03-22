/**
 * Na Linux CI (Vercel) Next-ov require-hook ne uvek vidi hoisted
 * `lightningcss-linux-x64-gnu` u korenu monorepa — kopiramo ga pored `web/node_modules/lightningcss`.
 */
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const web = path.join(root, "web");
const name = "lightningcss-linux-x64-gnu";
const dest = path.join(web, "node_modules", name);
const rootPkg = path.join(root, "node_modules", name);
const ver = "1.32.0";

if (process.platform !== "linux" || process.arch !== "x64") {
  process.exit(0);
}

if (fs.existsSync(path.join(dest, "package.json"))) {
  process.exit(0);
}

fs.mkdirSync(path.join(web, "node_modules"), { recursive: true });

if (fs.existsSync(path.join(rootPkg, "package.json"))) {
  fs.cpSync(rootPkg, dest, { recursive: true });
  process.exit(0);
}

const r = spawnSync(
  "npm",
  ["install", `${name}@${ver}`, "--no-save", "--no-audit", "--no-fund"],
  { cwd: web, stdio: "inherit", shell: true }
);
process.exit(r.status === 0 ? 0 : 1);
