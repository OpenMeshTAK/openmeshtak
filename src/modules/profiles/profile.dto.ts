import type { Uuid } from "../../shared/http/uuid.js";
import type {
  MeshtasticDeviceRole,
  TakRole,
  TakTeam,
} from "../event-groups/provisioning-values.js";

/**
 * A channel the member receives. `included` channels come with the member's channel set;
 * `on-site` channels are secret and handed out on site by a key holder before their release.
 */
export interface ProfileChannel {
  id: Uuid;
  name: string;
  primary: boolean;
  uplinkEnabled: boolean;
  downlinkEnabled: boolean;
  positionPrecision: number;
  delivery: "included" | "on-site";
  /** Holds this secret channel ahead of the event to share it on site. */
  keyHolder: boolean;
}

export interface ProfileAssignment {
  slug: string;
  name: string;
}

/**
 * The single resolved provisioning identity of one member in one event. Every TAK, Meshtastic and
 * mission output is derived from this shape.
 */
export interface ResolvedProfileDto {
  eventId: Uuid;
  memberId: Uuid;
  userId: Uuid;
  /**
   * `published` profiles use the event's latest configuration revision. `preview` profiles of
   * draft events use the current, unpublished configuration and are visible to administrators only.
   */
  source: "published" | "preview";
  configurationRevision: { id: Uuid; number: number } | null;
  username: string;
  callsign: string;
  eventRole: ProfileAssignment;
  group: ProfileAssignment;
  tak: {
    callsign: string;
    team: TakTeam;
    role: TakRole;
    serverGroups: string[];
  };
  meshtastic: {
    longName: string;
    /** `null` only in previews while the group has no short-name prefix. */
    shortName: string | null;
    deviceRole: MeshtasticDeviceRole;
    /** Device order, primary first. Channels outside the member's audience are absent. */
    channels: ProfileChannel[];
  };
  missionGroups: string[];
}

export interface MyEventMembershipDto {
  eventId: Uuid;
  eventName: string;
  eventSlug: string;
  timeZone: string;
  memberId: Uuid;
  callsign: string;
}
