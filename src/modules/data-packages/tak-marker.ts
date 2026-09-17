import { Prisma } from "../../generated/prisma/client.js";
import { validationProblem } from "../../shared/errors/problem-error.js";
import type { PackageGeometry, TakMarker } from "./package-object.dto.js";

/** ATAK's spot marker; markers without TAK metadata are exported as this type. */
export const SPOT_MARKER_TYPE = "b-m-p-s-m";

/** Same rule as the `CotType` DTO pattern; imported values that do not match are dropped. */
const COT_TYPE_PATTERN = /^[a-z](-[A-Za-z0-9]+){1,15}$/;

/** Icon set paths end up in XML attributes; control characters and markup are refused. */
function isSafeIconsetPath(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= 256 &&
    [...value].every((character) => character.charCodeAt(0) >= 0x20 && !"<>\"".includes(character))
  );
}

/** Builds marker metadata from untrusted input, or `null` when nothing valid is left. */
export function parseTakMarker(cotType: unknown, iconsetPath: unknown): TakMarker | null {
  const type = typeof cotType === "string" && COT_TYPE_PATTERN.test(cotType) ? cotType : null;
  const path = typeof iconsetPath === "string" && isSafeIconsetPath(iconsetPath) ? iconsetPath : null;
  if (type === null && path === null) {
    return null;
  }
  return { cotType: type ?? SPOT_MARKER_TYPE, iconsetPath: path };
}

/** Column value for an object's TAK metadata; only markers may carry it. */
export function takColumn(
  geometry: PackageGeometry,
  tak: TakMarker | null | undefined,
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  if (tak === undefined || tak === null) {
    return Prisma.DbNull;
  }
  if (geometry.type !== "Point") {
    throw validationProblem([{ field: "tak", code: "NOT_A_MARKER", message: "Only markers carry TAK symbol metadata." }]);
  }
  return { cotType: tak.cotType, iconsetPath: tak.iconsetPath } satisfies TakMarker;
}

/** Written only through `takColumn`. */
export function readTak(value: Prisma.JsonValue | null): TakMarker | null {
  return value === null ? null : (value as unknown as TakMarker);
}
