import type { Uuid } from "../../shared/http/uuid.js";

/** A published Data Package a member receives, at its newest revision. */
export interface MemberDataPackageDto {
  id: Uuid;
  name: string;
  description: string | null;
  /** Newest published revision; downloads always deliver this one. */
  revision: number;
  /** @format date-time */
  publishedAt: string;
}
