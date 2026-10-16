import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";

import { buildImportGraph, selectChangedTests, selectTests, type TestSelection } from "../scripts/changed-tests.js";

const roots: string[] = [];

const tests = ["test/a.test.ts", "test/b.test.ts", "test/c.test.ts", "test/d.test.ts"];

// A small project in a real Git repository: main holds the baseline, the work branch the changes.
const baseline: Record<string, string> = {
  "README.md": "# Fixture\n",
  "package.json": "{}\n",
  "tsconfig.json": "{}\n",
  "prisma/schema.prisma": "// schema\n",
  "lib/shared.ts": "export const shared = 1;\n",
  "lib/feature.ts": "import { shared } from \"./shared.js\";\nexport const feature = shared + 1;\n",
  "lib/other.ts": "export const other = 2;\n",
  "lib/cli.ts": "import { other } from \"./other.js\";\nconsole.log(other);\n",
  "lib/types.ts": "export interface Shape { size: number }\n",
  "test/support/helper.ts": "export { other } from \"../../lib/other.js\";\n",
  "test/a.test.ts": "import { feature } from \"../lib/feature.js\";\nvoid feature;\n",
  "test/b.test.ts": "import { shared } from \"../lib/shared.js\";\nimport type { Shape } from \"../lib/types.js\";\nexport const shape: Shape = { size: shared };\n",
  "test/c.test.ts": "import { other } from \"./support/helper.js\";\nvoid other;\n",
  // Spawns a script by path instead of importing it.
  "test/d.test.ts": "import { spawnSync } from \"node:child_process\";\nspawnSync(process.execPath, [\"lib/cli.ts\"]);\n",
};

function write(root: string, path: string, content: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}

function git(root: string, ...args: string[]): void {
  execFileSync("git", ["-C", root, ...args], { stdio: "ignore" });
}

function commit(root: string, ...args: string[]): void {
  git(root, "-c", "user.name=Test", "-c", "user.email=test@example.invalid", "-c", "commit.gpgsign=false", "commit", "--quiet", ...args);
}

function createRepository(): string {
  const root = mkdtempSync(join(tmpdir(), "omtk-changed-tests-"));
  roots.push(root);
  for (const [path, content] of Object.entries(baseline)) {
    write(root, path, content);
  }
  git(root, "init", "--quiet", "--initial-branch=main");
  git(root, "add", "--all");
  commit(root, "-m", "baseline");
  git(root, "switch", "--quiet", "-c", "work");
  return root;
}

function select(root: string, base = "main"): TestSelection {
  return selectChangedTests(root, tests, base);
}

function selectedTests(selection: TestSelection): Record<string, string> {
  assert.equal(selection.kind, "selected", JSON.stringify(selection));
  return selection.kind === "selected" ? Object.fromEntries(selection.tests) : {};
}

function fullReasons(selection: TestSelection): string[] {
  assert.equal(selection.kind, "full", JSON.stringify(selection));
  return selection.kind === "full" ? selection.reasons : [];
}

after(() => {
  for (const root of roots) {
    rmSync(root, { recursive: true, force: true });
  }
});

void describe("changed test selection", () => {
  void it("runs nothing without changes", () => {
    assert.deepEqual(select(createRepository()), { kind: "none", ignored: [], base: "main" });
  });

  void it("selects a changed test file", () => {
    const root = createRepository();
    write(root, "test/a.test.ts", `${baseline["test/a.test.ts"] ?? ""}// changed\n`);
    assert.deepEqual(selectedTests(select(root)), { "test/a.test.ts": "changed test file" });
  });

  void it("selects every test that imports a changed file, directly or transitively", () => {
    const root = createRepository();
    write(root, "lib/shared.ts", "export const shared = 3;\n");
    assert.deepEqual(selectedTests(select(root)), {
      "test/a.test.ts": "depends on lib/shared.ts through lib/feature.ts",
      "test/b.test.ts": "depends on lib/shared.ts",
    });
  });

  void it("selects the tests that use a changed shared helper", () => {
    const root = createRepository();
    write(root, "test/support/helper.ts", "export const other = 5;\n");
    assert.deepEqual(selectedTests(select(root)), { "test/c.test.ts": "depends on test/support/helper.ts" });
  });

  void it("follows scripts that tests name by path", () => {
    const root = createRepository();
    write(root, "lib/other.ts", "export const other = 4;\n");
    assert.deepEqual(selectedTests(select(root)), {
      "test/c.test.ts": "depends on lib/other.ts through test/support/helper.ts",
      "test/d.test.ts": "depends on lib/other.ts through lib/cli.ts",
    });
  });

  void it("includes committed, staged, unstaged and untracked changes", () => {
    const root = createRepository();
    write(root, "lib/shared.ts", "export const shared = 3;\n");
    commit(root, "-am", "committed");
    write(root, "test/support/helper.ts", "export const other = 5;\n");
    git(root, "add", "test/support/helper.ts");
    write(root, "lib/cli.ts", "console.log(1);\n");
    write(root, "test/e.test.ts", "// new test\n");
    assert.deepEqual(Object.keys(selectedTests(selectChangedTests(root, [...tests, "test/e.test.ts"], "main"))), [
      "test/a.test.ts",
      "test/b.test.ts",
      "test/c.test.ts",
      "test/d.test.ts",
      "test/e.test.ts",
    ]);
  });

  void it("runs nothing for documentation changes", () => {
    const root = createRepository();
    write(root, "README.md", "# Changed\n");
    write(root, "docs/guide.md", "New\n");
    assert.deepEqual(select(root), { kind: "none", ignored: ["README.md", "docs/guide.md"], base: "main" });
  });

  void it("runs the complete suite for Prisma, configuration and dependency changes", () => {
    const root = createRepository();
    write(root, "prisma/schema.prisma", "// changed\n");
    write(root, "tsconfig.json", "{ \"compilerOptions\": {} }\n");
    write(root, "package.json", "{ \"dependencies\": {} }\n");
    write(root, "lib/shared.ts", "export const shared = 3;\n");
    assert.deepEqual(fullReasons(select(root)), [
      "package.json: package dependencies",
      "prisma/schema.prisma: Prisma schema, migrations or configuration",
      "tsconfig.json: TypeScript configuration",
    ]);
  });

  void it("runs the complete suite for files no test reaches", () => {
    const root = createRepository();
    write(root, "lib/server.ts", "export {};\n");
    write(root, "assets/logo.png", "png");
    assert.deepEqual(fullReasons(select(root)), [
      "assets/logo.png: no test imports or names it",
      "lib/server.ts: no test imports or names it",
    ]);
  });

  void it("runs the complete suite for deleted source files", () => {
    const root = createRepository();
    rmSync(join(root, "lib/types.ts"));
    assert.deepEqual(fullReasons(select(root)), ["lib/types.ts: deleted"]);
  });

  void it("runs the complete suite when an import cannot be followed", () => {
    const root = createRepository();
    write(root, "lib/feature.ts", "const name = \"./shared.js\";\nexport const feature = await import(name);\n");
    assert.deepEqual(fullReasons(select(root)), ["ambiguous dependency: lib/feature.ts: non-literal import at line 2"]);

    write(root, "lib/feature.ts", "export { shared } from \"./missing.js\";\n");
    assert.deepEqual(fullReasons(select(root)), ["ambiguous dependency: lib/feature.ts: cannot resolve \"./missing.js\""]);
  });

  void it("runs the complete suite when the baseline is missing or invalid", () => {
    const root = createRepository();
    write(root, "test/a.test.ts", "// changed\n");
    assert.deepEqual(fullReasons(select(root, "no-such-branch")), ["baseline unavailable: no merge-base between HEAD and no-such-branch"]);

    const notRepository = mkdtempSync(join(tmpdir(), "omtk-changed-tests-"));
    roots.push(notRepository);
    assert.equal(select(notRepository).kind, "full");
  });

  void it("accepts Windows paths", () => {
    const root = createRepository();
    const windowsTests = tests.map((test) => test.replaceAll("/", "\\"));
    const graph = buildImportGraph(root, windowsTests);
    const selection = selectTests(["lib\\shared.ts", "docs\\notes.md"], windowsTests, graph, () => true);
    assert.deepEqual(selection, {
      kind: "selected",
      tests: new Map([
        ["test/a.test.ts", "depends on lib/shared.ts through lib/feature.ts"],
        ["test/b.test.ts", "depends on lib/shared.ts"],
      ]),
      ignored: ["docs/notes.md"],
    });
  });
});
