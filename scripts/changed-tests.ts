import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { join, posix } from "node:path";
import ts from "typescript";

/**
 * Selects the test files a local change can affect, for `pnpm test:changed`. Every doubt selects
 * the complete suite: a skipped test that would have failed costs more than a slower run. CI and
 * releases never use this selection; they run `pnpm test` and `pnpm check`.
 */
export type TestSelection =
  | { kind: "full"; reasons: string[] }
  | { kind: "selected"; tests: Map<string, string>; ignored: string[] }
  | { kind: "none"; ignored: string[] };

export interface ImportGraph {
  /** Maps a file, or a directory as "dir/", to the files that import or name it. */
  dependents: Map<string, Set<string>>;
  /** Imports the graph cannot follow, in files that tests load. */
  problems: string[];
}

// Changes that can affect every test, or that no import names.
const fullSuiteRules: { pattern: RegExp; reason: string }[] = [
  { pattern: /^prisma\/|^prisma7\.config\.ts$/, reason: "Prisma schema, migrations or configuration" },
  { pattern: /^(package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|\.npmrc)$/, reason: "package dependencies" },
  { pattern: /^tsconfig(\.[^/]+)?\.json$/, reason: "TypeScript configuration" },
  { pattern: /^(tsoa\.json|openapi\/|src\/generated\/)/, reason: "generated API contract" },
  // The runner, its selection, the worker setup, migrations and generation serve every test file.
  { pattern: /^scripts\/(run-tests|changed-tests|generate|test-worker-environment|run-prisma|prepare-data)\.ts$/, reason: "test infrastructure" },
  // The runner passes the fixture profiles to every worker through the environment.
  { pattern: /^test\/fixtures\//, reason: "test fixtures" },
  { pattern: /^\.env/, reason: "environment configuration" },
];

// Files that no test loads: documentation, licensing, editor and CI configuration and the linter.
const noTestImpact = [
  /\.md$/i,
  /^LICENSE$/,
  /^licenses\//,
  /^\.github\//,
  /^\.vscode\//,
  /^\.gitignore$/,
  /^\.gitattributes$/,
  /^\.dockerignore$/,
  /^Dockerfile$/,
  /^eslint\.config\.js$/,
];

// Non-literal imports the graph cannot follow, reviewed to load only installed packages. Any other
// non-literal import selects the complete suite.
const reviewedDynamicImports = new Set(["src/modules/meshtastic-firmware/profile-protobufs.ts"]);

const sourceExtensions = [".ts", ".mts", ".cts", ".tsx"];

export function normalizePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\//, "");
}

function git(root: string, args: string[]): string {
  return execFileSync("git", ["-C", root, "-c", "core.quotepath=off", ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function splitNul(output: string): string[] {
  return output.split("\0").filter((path) => path !== "");
}

function refExists(root: string, ref: string): boolean {
  try {
    git(root, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

/** The explicit base, TEST_CHANGED_BASE, origin/main or main, in that order. */
export function defaultBase(root: string, requested = process.env.TEST_CHANGED_BASE): string {
  if (requested !== undefined && requested !== "") {
    return requested;
  }
  return refExists(root, "origin/main") || !refExists(root, "main") ? "origin/main" : "main";
}

/**
 * Lists every file that differs from the merge-base with `base`: committed branch changes,
 * staged and unstaged changes, deletions and untracked files.
 */
export function readChangedFiles(root: string, base: string): { files: string[]; mergeBase: string } | { error: string } {
  let mergeBase: string;
  try {
    mergeBase = git(root, ["merge-base", "HEAD", base]).trim();
  } catch {
    return { error: `no merge-base between HEAD and ${base}` };
  }
  const diff = ["diff", "--name-only", "--no-renames", "--relative", "-z"];
  const files = [
    // The working tree against the merge-base covers commits, staged and unstaged changes.
    ...splitNul(git(root, [...diff, mergeBase, "--"])),
    ...splitNul(git(root, [...diff, "--cached", mergeBase, "--"])),
    ...splitNul(git(root, ["ls-files", "--others", "--exclude-standard", "-z", "--", "."])),
  ];
  return { files: [...new Set(files.map(normalizePath))].sort(), mergeBase };
}

function pathKind(root: string, path: string): "file" | "directory" | undefined {
  try {
    const stats = statSync(join(root, path));
    return stats.isFile() ? "file" : stats.isDirectory() ? "directory" : undefined;
  } catch {
    return undefined;
  }
}

/** Resolves a relative import the way NodeNext does for TypeScript sources: ./a.js may be ./a.ts. */
function resolveImport(root: string, from: string, specifier: string): string | undefined {
  const target = posix.join(posix.dirname(from), specifier);
  const withoutJs = target.replace(/\.(m|c)?jsx?$/, "");
  const candidates = [
    target,
    ...sourceExtensions.map((extension) => withoutJs + extension),
    ...sourceExtensions.map((extension) => `${target}/index${extension}`),
  ];
  return candidates.find((candidate) => pathKind(root, candidate) === "file");
}

/**
 * Tests also reach files by name: a spawned script, a fixture read with readFileSync or a file
 * located with new URL(..., import.meta.url). A string that names an existing repository path
 * counts as a dependency. Unneeded matches only select more tests.
 */
function resolveNamedPath(root: string, from: string, text: string): string | undefined {
  if (!/^[\w@.-]+(\/[\w@.-]+)+\/?$/.test(text)) {
    return undefined;
  }
  const path = text.startsWith(".") ? posix.join(posix.dirname(from), text) : posix.normalize(text);
  if (path.startsWith("../")) {
    return undefined;
  }
  const kind = pathKind(root, path);
  return kind === "file" ? path.replace(/\/$/, "") : kind === "directory" ? `${path.replace(/\/$/, "")}/` : undefined;
}

function isTypeOnly(node: ts.Node): boolean {
  // TypeScript erases these, so they cannot change what a test executes.
  return (ts.isImportDeclaration(node) && node.importClause?.isTypeOnly === true)
    || (ts.isExportDeclaration(node) && node.isTypeOnly);
}

function readDependencies(root: string, file: string): { dependencies: string[]; problems: string[] } {
  const source = ts.createSourceFile(file, readFileSync(join(root, file), "utf8"), ts.ScriptTarget.Latest);
  const dependencies: string[] = [];
  const problems: string[] = [];

  const addImport = (specifier: string): void => {
    if (specifier.startsWith("#") || specifier.startsWith("/")) {
      problems.push(`${file}: cannot resolve "${specifier}"`);
    } else if (specifier.startsWith(".")) {
      const resolved = resolveImport(root, file, specifier);
      if (resolved === undefined) {
        problems.push(`${file}: cannot resolve "${specifier}"`);
      } else {
        dependencies.push(resolved);
      }
    }
    // Package imports change only with package.json or the lockfile, which select every test.
  };

  const visit = (node: ts.Node): void => {
    if (isTypeOnly(node)) {
      return;
    }
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
      && node.moduleSpecifier !== undefined && ts.isStringLiteral(node.moduleSpecifier)) {
      addImport(node.moduleSpecifier.text);
      return;
    }
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)
      && ts.isStringLiteral(node.moduleReference.expression)) {
      addImport(node.moduleReference.expression.text);
      return;
    }
    if (ts.isCallExpression(node)
      && (node.expression.kind === ts.SyntaxKind.ImportKeyword
        || (ts.isIdentifier(node.expression) && node.expression.text === "require"))) {
      const [argument] = node.arguments;
      if (argument !== undefined && ts.isStringLiteralLike(argument)) {
        addImport(argument.text);
      } else if (!reviewedDynamicImports.has(file)) {
        problems.push(`${file}: non-literal import at line ${String(source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1)}`);
      }
    }
    if (ts.isStringLiteralLike(node)) {
      const named = resolveNamedPath(root, file, node.text);
      if (named !== undefined && named !== file) {
        dependencies.push(named);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { dependencies, problems };
}

/** Follows the dependencies of every test file, transitively, through the current working tree. */
export function buildImportGraph(root: string, testFiles: string[]): ImportGraph {
  const dependents = new Map<string, Set<string>>();
  const problems: string[] = [];
  const queue = testFiles.map(normalizePath);
  const visited = new Set(queue);

  while (queue.length > 0) {
    const file = queue.shift() as string;
    if (!sourceExtensions.some((extension) => file.endsWith(extension)) && !/\.(m|c)?js$/.test(file)) {
      continue;
    }
    const result = readDependencies(root, file);
    problems.push(...result.problems);
    for (const dependency of result.dependencies) {
      let importers = dependents.get(dependency);
      if (importers === undefined) {
        importers = new Set();
        dependents.set(dependency, importers);
      }
      importers.add(file);
      if (!visited.has(dependency) && !dependency.endsWith("/")) {
        visited.add(dependency);
        queue.push(dependency);
      }
    }
  }
  return { dependents, problems };
}

/** The file itself plus every directory that contains it, as named-directory dependencies. */
function graphKeys(file: string): string[] {
  const parts = file.split("/");
  return [file, ...parts.slice(0, -1).map((_, index) => `${parts.slice(0, index + 1).join("/")}/`)];
}

/** Finds the tests that depend on `changed`, each with the file through which it depends. */
function dependentTests(changed: string, graph: ImportGraph, tests: Set<string>): Map<string, string | undefined> {
  const found = new Map<string, string | undefined>();
  const via = new Map<string, string | undefined>();
  const queue: string[] = [];
  for (const key of graphKeys(changed)) {
    for (const importer of graph.dependents.get(key) ?? []) {
      if (!via.has(importer)) {
        via.set(importer, undefined);
        queue.push(importer);
      }
    }
  }
  while (queue.length > 0) {
    const file = queue.shift() as string;
    if (tests.has(file) && !found.has(file)) {
      found.set(file, via.get(file));
    }
    for (const importer of graph.dependents.get(file) ?? []) {
      if (!via.has(importer)) {
        // Remember the file the importer loads on its way to the change.
        via.set(importer, file);
        queue.push(importer);
      }
    }
  }
  return found;
}

/** Decides which tests to run for a list of changed paths. Pure, so it is easy to test. */
export function selectTests(changedFiles: string[], testFiles: string[], graph: ImportGraph, exists: (path: string) => boolean): TestSelection {
  const tests = new Set(testFiles.map(normalizePath));
  const selected = new Map<string, string>();
  const ignored: string[] = [];
  const fullReasons: string[] = [];

  for (const file of changedFiles.map(normalizePath)) {
    const rule = fullSuiteRules.find(({ pattern }) => pattern.test(file));
    if (rule !== undefined) {
      fullReasons.push(`${file}: ${rule.reason}`);
      continue;
    }
    if (noTestImpact.some((pattern) => pattern.test(file))) {
      ignored.push(file);
      continue;
    }
    if (tests.has(file)) {
      selected.set(file, "changed test file");
      continue;
    }
    if (!exists(file)) {
      if (/^test\/.*\.test\.ts$/.test(file)) {
        ignored.push(file);
      } else {
        // Its former importers can no longer be traced.
        fullReasons.push(`${file}: deleted`);
      }
      continue;
    }
    const dependents = dependentTests(file, graph, tests);
    if (dependents.size === 0) {
      // Nothing visible loads it, yet it may be loaded at runtime.
      fullReasons.push(`${file}: no test imports or names it`);
      continue;
    }
    for (const [test, through] of dependents) {
      if (!selected.has(test)) {
        selected.set(test, through === undefined ? `depends on ${file}` : `depends on ${file} through ${through}`);
      }
    }
  }

  if (fullReasons.length > 0) {
    return { kind: "full", reasons: fullReasons };
  }
  if (selected.size > 0 && graph.problems.length > 0) {
    return { kind: "full", reasons: graph.problems.map((problem) => `ambiguous dependency: ${problem}`) };
  }
  if (selected.size === 0) {
    return { kind: "none", ignored };
  }
  return { kind: "selected", tests: new Map([...selected].sort(([left], [right]) => left.localeCompare(right))), ignored };
}

/** Reads the Git changes of `root` and selects the affected tests. */
export function selectChangedTests(root: string, testFiles: string[], base = defaultBase(root)): TestSelection & { base: string } {
  const changes = readChangedFiles(root, base);
  if ("error" in changes) {
    return { kind: "full", reasons: [`baseline unavailable: ${changes.error}`], base };
  }
  if (changes.files.length === 0) {
    return { kind: "none", ignored: [], base };
  }
  const graph = buildImportGraph(root, testFiles);
  return { ...selectTests(changes.files, testFiles, graph, (path) => pathKind(root, path) !== undefined), base };
}

export function describeSelection(selection: TestSelection & { base: string }, total: number): string {
  const lines = [`Changed tests compared with ${selection.base}:`];
  if (selection.kind === "full") {
    lines.push(`Running all ${String(total)} test files:`, ...selection.reasons.map((reason) => `  ${reason}`));
  } else if (selection.kind === "none") {
    lines.push("No changed file affects a test; nothing to run.");
  } else {
    lines.push(`Running ${String(selection.tests.size)} of ${String(total)} test files:`);
    lines.push(...[...selection.tests].map(([test, reason]) => `  ${test}: ${reason}`));
  }
  if (selection.kind !== "full" && selection.ignored.length > 0) {
    lines.push(`Without test impact: ${selection.ignored.join(", ")}`);
  }
  return `${lines.join("\n")}\n`;
}
