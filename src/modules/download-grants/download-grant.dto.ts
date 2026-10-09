import type { Uuid } from "../../shared/http/uuid.js";

export type DownloadGrantKind =
  | "device-profile"
  | "member-data-package"
  | "tak-connection-package"
  | "itak-connection-package"
  | "wintak-connection-package";

export interface CreateDownloadGrantRequest {
  kind: DownloadGrantKind;
  /** Required for `device-profile` and `member-data-package`. */
  eventId?: Uuid;
  /** Required for `device-profile` and `member-data-package`. */
  memberId?: Uuid;
  /** Required for `member-data-package`. */
  packageId?: Uuid;
}

/** A link that downloads the artifact without a session, e.g. from a QR code on another device. */
export interface DownloadGrantDto {
  /** Treat as a secret: whoever has it can download the file until it expires. */
  url: string;
  /** @format date-time */
  expiresAt: string;
}
