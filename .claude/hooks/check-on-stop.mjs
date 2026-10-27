// Stop hook: run typecheck and tests before the agent hands over.
// Contract: specs/001-foundation/contracts/agent-hooks.md
//   - Skip when there are no uncommitted code changes and HEAD already passed.
//   - Failures 1-3 in a turn: exit 2, which sends the agent back to fix them.
//   - Failure 4: exit 0 with a systemMessage, which hands over with the failures reported.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const MAX_ATTEMPTS = 3;
const TAIL_LINES = 80;
const NON_CODE_DIRS = ["specs/", "docs/", ".specify/"];

const projectDir = path.resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
const stateDir = path.join(os.tmpdir(), "fridgeit-stop-hook");
const lastGreenFile = path.join(stateDir, "last-green-head");

function sh(command, args) {
  const options = { cwd: projectDir, encoding: "utf8" };
  // npm is a .cmd shim on Windows, so it needs a shell there. Every command here is a fixed
  // string, so joining them into one command line is safe.
  if (process.platform === "win32") {
    return spawnSync([command, ...args].join(" "), { ...options, shell: true });
  }
  return spawnSync(command, args, options);
}

function readText(file) {
  return existsSync(file) ? readFileSync(file, "utf8").trim() : undefined;
}

function tail(text, lines) {
  return text.trim().split(/\r?\n/).slice(-lines).join("\n");
}

const input = JSON.parse(readFileSync(0, "utf8"));
const sessionId = String(input.session_id ?? "unknown").replace(/[^\w-]/g, "_");
const stateFile = path.join(stateDir, `${sessionId}.json`);

const status = sh("git", ["status", "--porcelain"]);
const changedCode = status.stdout
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => line.slice(3).split(" -> ").pop().replace(/^"|"$/g, ""))
  .some((file) => !NON_CODE_DIRS.some((dir) => file.startsWith(dir)));
const head = sh("git", ["rev-parse", "HEAD"]).stdout.trim();

if (!changedCode && head !== "" && head === readText(lastGreenFile)) process.exit(0);

const typecheck = sh("npm", ["run", "typecheck"]);
const tests = typecheck.status === 0 ? sh("npm", ["test", "--", "--silent"]) : undefined;

mkdirSync(stateDir, { recursive: true });

if (typecheck.status === 0 && tests.status === 0) {
  rmSync(stateFile, { force: true });
  if (head !== "") writeFileSync(lastGreenFile, head);
  process.exit(0);
}

const failed = tests ?? typecheck;
const output = tail(`${failed.stdout}\n${failed.stderr}`, TAIL_LINES);

let attempts = 0;
if (input.stop_hook_active === true) {
  try {
    attempts = JSON.parse(readFileSync(stateFile, "utf8")).attempts ?? 0;
  } catch {
    attempts = 0;
  }
}
attempts += 1;

if (attempts <= MAX_ATTEMPTS) {
  writeFileSync(stateFile, JSON.stringify({ attempts }));
  console.error(
    `Typecheck/tests failed (attempt ${attempts} of ${MAX_ATTEMPTS}). Fix these before handing over:\n${output}`,
  );
  process.exit(2);
}

rmSync(stateFile, { force: true });
console.log(
  JSON.stringify({
    systemMessage: `Checks still failing after ${MAX_ATTEMPTS} attempts — handing over with failures:\n${output}`,
  }),
);
