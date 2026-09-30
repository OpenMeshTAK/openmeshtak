import { database } from "../../shared/database/database.js";
import { ProblemError } from "../../shared/errors/problem-error.js";

/**
 * Every account has a lowercase username for sign-in and as its TAK login name, so a person can
 * type it into ATAK or iTAK. Better Auth's username plugin stores it on the auth user.
 */
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 32;
const USERNAME_PATTERN = /^[a-z0-9._-]+$/;

export function isValidUsername(username: string): boolean {
  return (
    username.length >= USERNAME_MIN_LENGTH &&
    username.length <= USERNAME_MAX_LENGTH &&
    USERNAME_PATTERN.test(username)
  );
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function invalidUsernameProblem(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:invalid-username",
    title: "Invalid username",
    status: 422,
    detail: `Use ${String(USERNAME_MIN_LENGTH)} to ${String(USERNAME_MAX_LENGTH)} lowercase letters, digits, dots, underscores or hyphens.`,
    code: "INVALID_USERNAME",
  });
}

export function usernameTakenProblem(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:username-taken",
    title: "Username taken",
    status: 409,
    detail: "Another account already uses this username.",
    code: "USERNAME_TAKEN",
  });
}

/** "Peter Müller" becomes "peter.muller"; names without usable characters fall back to "user". */
export function usernameBaseFrom(name: string): string {
  const base = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, USERNAME_MAX_LENGTH - 4);
  return base.length >= USERNAME_MIN_LENGTH ? base : `user${base}`.slice(0, USERNAME_MAX_LENGTH - 4);
}

/** The first free username for a name: `peter`, then `peter2`, `peter3`, ... */
export async function availableUsernameFor(name: string): Promise<string> {
  const base = usernameBaseFrom(name);
  for (let suffix = 1; ; suffix += 1) {
    const candidate = suffix === 1 ? base : `${base}${String(suffix)}`;
    const taken = await database.user.findUnique({ where: { username: candidate }, select: { id: true } });
    if (taken === null) {
      return candidate;
    }
  }
}

/** Gives an auth user without a username one derived from its name. */
export async function assignMissingUsername(authSubjectId: string): Promise<void> {
  const user = await database.user.findUnique({ where: { id: authSubjectId }, select: { name: true, username: true } });
  if (user === null || user.username !== null) {
    return;
  }
  const username = await availableUsernameFor(user.name);
  await database.user.updateMany({ where: { id: authSubjectId, username: null }, data: { username, displayUsername: username } });
}

/** Accounts created before usernames existed get one at startup; administrators can change it. */
export async function backfillUsernames(): Promise<void> {
  const users = await database.user.findMany({ where: { username: null }, select: { id: true } });
  for (const { id } of users) {
    await assignMissingUsername(id);
  }
}
