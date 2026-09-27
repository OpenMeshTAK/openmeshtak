import { decryptAcmeApiToken } from "./acme-settings.js";
import type { AcmeChallengeInput, AcmeChallengeSolver, PresentedAcmeChallenge } from "./acme-challenge.js";

const CLOUDFLARE_API = "https://api.cloudflare.com/client/v4";

type Fetcher = typeof fetch;

interface CloudflareResponse {
  success?: boolean;
  result?: { id?: string };
}

export class CloudflareDnsError extends Error {
  constructor(action: string, status: number) {
    super(`Cloudflare could not ${action} the ACME DNS record (HTTP ${String(status)}).`);
    this.name = "CloudflareDnsError";
  }
}

function recordIdOf(value: unknown): string | null {
  if (value === null || typeof value !== "object") {
    return null;
  }
  const response = value as CloudflareResponse;
  return response.success === true && typeof response.result?.id === "string" ? response.result.id : null;
}

/** Cloudflare implementation of the first ACME solver: a scoped token creates one TXT record. */
export class CloudflareDnsChallengeSolver implements AcmeChallengeSolver {
  readonly challengeType = "dns-01";
  readonly provider = "cloudflare";

  constructor(
    private readonly zoneId: string,
    private readonly apiTokenEnvelope: string,
    private readonly fetcher: Fetcher = fetch,
  ) {}

  async present(input: AcmeChallengeInput): Promise<PresentedAcmeChallenge> {
    if (input.challengeType !== this.challengeType) {
      throw new Error(`Cloudflare DNS cannot present ${input.challengeType}.`);
    }
    const response = await this.fetcher(`${CLOUDFLARE_API}/zones/${this.zoneId}/dns_records`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${decryptAcmeApiToken(this.apiTokenEnvelope)}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        type: "TXT",
        name: `_acme-challenge.${input.identifier}`,
        content: input.keyAuthorization,
        ttl: 60,
        comment: "OpenMeshTak ACME challenge",
      }),
    });
    const recordId = recordIdOf(await response.json().catch(() => null));
    if (!response.ok || recordId === null) {
      throw new CloudflareDnsError("create", response.status);
    }

    return {
      remove: async () => {
        const removed = await this.fetcher(`${CLOUDFLARE_API}/zones/${this.zoneId}/dns_records/${recordId}`, {
          method: "DELETE",
          headers: { authorization: `Bearer ${decryptAcmeApiToken(this.apiTokenEnvelope)}` },
        });
        if (!removed.ok && removed.status !== 404) {
          throw new CloudflareDnsError("remove", removed.status);
        }
      },
    };
  }
}
