import type { ProblemFieldError } from "../../shared/errors/problem-error.js";
import { isEmptyAudience, type EventAudience } from "../event-audience/event-audience.js";
import { pskKind } from "./channel-psk.js";

/**
 * Secrecy only protects anything with a real key: an unencrypted or well-known default key is
 * public anyway. Key holders exist only for secret channels.
 */
export function secrecyProblems(
  secret: boolean,
  keyHolders: EventAudience,
  pskBytes: number,
): ProblemFieldError[] {
  const problems: ProblemFieldError[] = [];
  const kind = pskKind(pskBytes);
  if (secret && kind !== "aes128" && kind !== "aes256") {
    problems.push({
      field: "secret",
      code: "SECRET_REQUIRES_KEY",
      message: "Secret channels need a 16-byte or 32-byte key.",
    });
  }
  if (!secret && !isEmptyAudience(keyHolders)) {
    problems.push({
      field: "keyHolders",
      code: "KEY_HOLDERS_REQUIRE_SECRET",
      message: "Only secret channels have key holders.",
    });
  }
  return problems;
}
