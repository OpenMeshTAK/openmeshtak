import type { Uuid } from "../http/uuid.js";
import type { Permission } from "./permissions.js";

export interface PermissionGrantDto {
  permission: Permission;
  /** Event the grant is limited to, or `null` for an instance-wide grant. */
  eventId: Uuid | null;
}
