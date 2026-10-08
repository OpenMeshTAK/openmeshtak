import type { AcmeChallengeInput, AcmeChallengeSolver, PresentedAcmeChallenge } from "./acme-challenge.js";

/**
 * Key authorizations of pending HTTP-01 challenges, by token. Core runs as one process and an order
 * lives only for the few seconds of validation, so memory is enough and nothing is persisted.
 */
const pending = new Map<string, string>();

/** The response Let's Encrypt expects at `/.well-known/acme-challenge/<token>`, if one is pending. */
export function acmeHttpChallengeResponse(token: string): string | undefined {
  return pending.get(token);
}

/**
 * Answers the HTTP-01 challenge through the Web address. Let's Encrypt fetches
 * `http://<host>/.well-known/acme-challenge/<token>`; the reverse proxy that already forwards the
 * Web host to Core (directly, or after redirecting to HTTPS) delivers it here. This works only when
 * the TAK host name is the Web host name, which the settings validation enforces.
 */
export class HttpChallengeSolver implements AcmeChallengeSolver {
  readonly challengeType = "http-01";
  readonly provider = "web-address";

  present(input: AcmeChallengeInput): Promise<PresentedAcmeChallenge> {
    // RFC 8555 §8.1: the key authorization is the token, a dot and the account key thumbprint.
    const token = input.keyAuthorization.split(".")[0] ?? "";
    if (input.challengeType !== this.challengeType || token === "") {
      return Promise.reject(new Error("The ACME server sent an unexpected HTTP-01 challenge."));
    }
    pending.set(token, input.keyAuthorization);
    return Promise.resolve({
      remove() {
        pending.delete(token);
        return Promise.resolve();
      },
    });
  }
}
