// PostToolUse hook (Edit|Write): format the edited file with Prettier, then lint it with ESLint.
// Contract: specs/001-foundation/contracts/agent-hooks.md
//   exit 0: formatted and linted cleanly, or skipped
//   exit 2: lint errors or warnings (or syntax errors) remain; stderr is shown to Claude, the
//           edit stands
//   exit 1: a tool could not run (for example, node_modules is missing)
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const PRETTIER_EXTS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".yml",
  ".yaml",
  ".md",
  ".css",
]);
const ESLINT_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

const projectDir = path.resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
const prettierBin = path.join(projectDir, "node_modules", "prettier", "bin", "prettier.cjs");
const eslintBin = path.join(projectDir, "node_modules", "eslint", "bin", "eslint.js");

function run(bin, args) {
  return spawnSync(process.execPath, [bin, ...args], { cwd: projectDir, encoding: "utf8" });
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

let input;
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch (error) {
  fail(`format-and-lint: could not parse hook input: ${error.message}`);
}

const rawPath = input?.tool_input?.file_path;
if (typeof rawPath !== "string" || rawPath === "") process.exit(0);

const file = path.resolve(projectDir, rawPath.replaceAll("\\", "/"));
const relative = path.relative(projectDir, file);
if (relative.startsWith("..") || path.isAbsolute(relative) || !existsSync(file)) process.exit(0);

const ext = path.extname(file).toLowerCase();
if (!PRETTIER_EXTS.has(ext)) process.exit(0);
if (!existsSync(prettierBin) || !existsSync(eslintBin)) {
  fail("format-and-lint: Prettier or ESLint is not installed. Run `npm ci`.");
}

const info = run(prettierBin, ["--file-info", file]);
if (info.status !== 0) fail(`format-and-lint: prettier --file-info failed:\n${info.stderr}`);
if (JSON.parse(info.stdout).ignored) process.exit(0);

const problems = [];

const prettier = run(prettierBin, ["--write", "--log-level", "warn", file]);
if (prettier.error) fail(`format-and-lint: could not run Prettier: ${prettier.error.message}`);
if (prettier.status !== 0)
  problems.push(`Prettier could not format ${relative}:\n${prettier.stderr}`);

if (ESLINT_EXTS.has(ext)) {
  // --max-warnings 0: warnings such as unused variables are reported back to the agent too.
  const eslint = run(eslintBin, ["--fix", "--no-warn-ignored", "--max-warnings", "0", file]);
  if (eslint.error) fail(`format-and-lint: could not run ESLint: ${eslint.error.message}`);
  if (eslint.status === 1) problems.push(`ESLint problems in ${relative}:\n${eslint.stdout}`);
  else if (eslint.status !== 0) fail(`format-and-lint: ESLint crashed:\n${eslint.stderr}`);
}

if (problems.length > 0) {
  console.error(problems.join("\n").trim());
  process.exit(2);
}
