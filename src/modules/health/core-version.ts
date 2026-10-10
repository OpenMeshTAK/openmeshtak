import { readFileSync } from "node:fs";

// package.json sits three levels above this file both in src/ and in the built dist/.
export const { version: coreVersion } = JSON.parse(readFileSync(new URL("../../../package.json", import.meta.url), "utf8")) as { version: string };
