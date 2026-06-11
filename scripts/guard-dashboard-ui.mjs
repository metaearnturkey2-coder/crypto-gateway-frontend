import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dashboardUiPath = resolve(rootDir, "src/components/dashboard-ui.js");
const source = readFileSync(dashboardUiPath, "utf8");

const guards = [
  {
    description: "DashboardPanel accepts rest props for polymorphic Link usage",
    pattern: /function\s+DashboardPanel\s*\(\s*\{[^}]*\.\.\.props[^}]*\}/s,
  },
  {
    description: "DashboardPanel forwards rest props to the rendered component",
    pattern: /<Component[^>]*\{\.\.\.props\}/s,
  },
  {
    description: "DashboardButton accepts rest props for href, disabled, and event handlers",
    pattern: /function\s+DashboardButton\s*\(\s*\{[^}]*\.\.\.props[^}]*\}/s,
  },
  {
    description: "DashboardButton forwards rest props to the rendered component",
    pattern: /<Component[\s\S]*?\{\.\.\.props\}[\s\S]*?>/s,
  },
  {
    description: "DashboardPill accepts rest props for polymorphic usage",
    pattern: /function\s+DashboardPill\s*\(\s*\{[^}]*\.\.\.props[^}]*\}/s,
  },
];

const failures = guards.filter((guard) => !guard.pattern.test(source));

for (const guard of guards) {
  const passed = !failures.includes(guard);
  console.log(`${passed ? "OK" : "FAIL"} ${guard.description}`);
}

if (failures.length > 0) {
  console.error(`Dashboard UI guard failed for ${failures.length} check(s).`);
  process.exit(1);
}

console.log("Dashboard UI guard passed.");
