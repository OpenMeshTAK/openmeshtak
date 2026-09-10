import type { Uuid } from "../../shared/http/uuid.js";

export type MemberClaimStatus = "open" | "consumed" | "revoked" | "expired";

export interface MemberClaimDto {
  id: Uuid;
  eventId: Uuid;
  memberId: Uuid;
  status: MemberClaimStatus;
  /** @format date-time */
  expiresAt: string;
  /** @format date-time */
  consumedAt: string | null;
  /** @format date-time */
  revokedAt: string | null;
  /** @format date-time */
  createdAt: string;
}

export interface CreatedMemberClaimResponse {
  claim: MemberClaimDto;
  /** Single-use bearer value. Returned exactly once and never retrievable again. */
  token: string;
  /**
   * Link for the participant. The token travels in the URL fragment, which browsers never send
   * to the server; the Web application removes it from history before exchanging it.
   */
  claimUrl: string;
}

export interface ClaimExchangeRequest {
  /** @maxLength 200 */
  token: string;
}

export interface ClaimExchangeResponse {
  user: {
    id: Uuid;
    displayName: string;
  };
  eventId: Uuid;
}
