import type { Uuid } from "../../shared/http/uuid.js";
import type { PageInfo } from "../../shared/pagination/cursor.js";

export interface UserDto {
  id: Uuid;
  displayName: string;
  /** Email of the linked local login, or `null` when the user has no local login yet. */
  email: string | null;
  /** @format date-time */
  createdAt: string;
}

export interface UserPage {
  items: UserDto[];
  page: PageInfo;
}
