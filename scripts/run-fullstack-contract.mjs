import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const playwrightCli = path.join(
  projectRoot,
  "node_modules",
  "playwright",
  "cli.js"
);

if (!existsSync(playwrightCli)) {
  console.error("Playwright is not installed. Run npm install first.");
  process.exit(1);
}

const child = spawn(
  process.execPath,
  [playwrightCli, "test", "tests/e2e/fullstack-contract.spec.js", ...process.argv.slice(2)],
  {
    cwd: projectRoot,
    env: {
      ...process.env,
      RUN_FULLSTACK_CONTRACT: "1",
    },
    stdio: "inherit",
  }
);

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`Playwright exited with signal ${signal}`);
    process.exit(1);
  }

  process.exit(code ?? 1);
});
