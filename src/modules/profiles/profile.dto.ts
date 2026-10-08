import type { Uuid } from "../../shared/http/uuid.js";
import type {
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

/** The built-in TAK server participants enroll with from the dashboard. */
export interface ProfileTakServer {
  /** `null` while the TAK server is not enabled. */
  hostName: string | null;
  streamingPort: number;
}

/**
 * The Meshtastic app's local TAK server, which carries CoT over the mesh when there is no network.
 * `meshChannel` is the value for the app's "TAK Mesh Channel": the channel's slot on this member's
 * device, or `null` while that channel has not reached the device yet (then the primary channel
 * is used).
 */
export interface ProfileMeshtasticTakServer {
  meshChannel: { name: string; slot: number } | null;
}

/** The Meshtastic firmware a participant must flash before importing OpenMeshTak settings. */
export interface ProfileFirmware {
  /** As recommended by the event, e.g. `2.8` or `2.8.3`. */
  recommendedVersion: string;
  line: string;
  /** Lowest version the settings are made for, e.g. `2.8.1`. */
  minimumVersion: string;
  channel: "stable" | "beta" | "alpha";
  /** `false` while no tested patch reaches the minimum version. */
  verified: boolean;
  flasherUrl: string;
  flashingNotes: string | null;
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
    /** The group's TAK server groups for an external TAK server; the built-in server ignores them. */
    serverGroups: string[];
    /** Every member enrolls with the built-in TAK server for Data Packages and CoT over the network. */
    server: ProfileTakServer;
    /** Meshtastic events also connect ATAK/iTAK to the Meshtastic app; `null` otherwise. */
    meshtasticLocalServer: ProfileMeshtasticTakServer | null;
  };
  /** `null` when the event does not use Meshtastic. */
  meshtastic: {
    longName: string;
    /** `null` only in previews while the group has no short-name prefix. */
    shortName: string | null;
    /** Device order, primary first. Channels outside the member's audience are absent. */
    channels: ProfileChannel[];
    /** `null` for configurations published before events had a firmware version. */
    firmware: ProfileFirmware | null;
  } | null;
}

export interface MyEventMembershipDto {
  eventId: Uuid;
  eventName: string;
  eventSlug: string;
  timeZone: string;
  memberId: Uuid;
  callsign: string;
}
