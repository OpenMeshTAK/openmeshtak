import type { TakAcmeSettings } from "../../generated/prisma/client.js";
import { CloudflareDnsChallengeSolver } from "./cloudflare-dns.js";
import { HttpChallengeSolver } from "./http-challenge.js";

/** Input shared by every ACME challenge implementation. */
export interface AcmeChallengeInput {
  identifier: string;
  challengeType: string;
  keyAuthorization: string;
}

/** A presented challenge must always be removable, including after failed validation. */
export interface PresentedAcmeChallenge {
  remove(): Promise<void>;
}

/**
 * The certificate lifecycle knows only this boundary. New DNS providers and challenge types can
 * be registered without changing account, order, renewal or certificate storage code.
 */
export interface AcmeChallengeSolver {
  readonly challengeType: string;
  readonly provider: string;
  present(input: AcmeChallengeInput): Promise<PresentedAcmeChallenge>;
}

export interface AcmeSolverDescriptor {
  challengeType: string;
  provider: string;
  label: string;
}

export const ACME_SOLVERS: readonly AcmeSolverDescriptor[] = [
  { challengeType: "http-01", provider: "web-address", label: "HTTP-01 · Web address" },
  { challengeType: "dns-01", provider: "cloudflare", label: "DNS-01 · Cloudflare" },
];

export function isSupportedAcmeSolver(challengeType: string, provider: string): boolean {
  return ACME_SOLVERS.some((solver) => solver.challengeType === challengeType && solver.provider === provider);
}

export function createAcmeChallengeSolver(settings: TakAcmeSettings): AcmeChallengeSolver {
  if (settings.challengeType === "dns-01" && settings.provider === "cloudflare") {
    return new CloudflareDnsChallengeSolver(settings.cloudflareZoneId ?? "", settings.apiTokenEnvelope ?? "");
  }
  if (settings.challengeType === "http-01" && settings.provider === "web-address") {
    return new HttpChallengeSolver();
  }
  throw new Error(`Unsupported ACME challenge solver: ${settings.challengeType}/${settings.provider}.`);
}
