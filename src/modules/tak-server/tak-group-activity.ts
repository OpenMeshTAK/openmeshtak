/** At most this many devices keep switched-off groups, oldest change dropped first. */
const MAX_DEVICES = 10_000;

/**
 * TAK group directions a TAK app switched off for itself (`PUT /Marti/api/groups/active`). Like
 * TAK Server, this is the app's own choice per device; it lives in memory and is forgotten when
 * Core restarts, after which every group is active again. It can only narrow what the member
 * receives or sends, never add a group.
 */
class TakGroupActivity {
  private readonly inactive = new Map<string, ReadonlySet<string>>();

  private key(userId: string, deviceUid: string): string {
    return `${userId}\u0000${deviceUid}`;
  }

  inactiveFor(userId: string, deviceUid: string | null): ReadonlySet<string> {
    return deviceUid === null ? new Set() : (this.inactive.get(this.key(userId, deviceUid)) ?? new Set());
  }

  set(userId: string, deviceUid: string, inactive: ReadonlySet<string>): void {
    const key = this.key(userId, deviceUid);
    this.inactive.delete(key);
    if (inactive.size > 0) {
      this.inactive.set(key, inactive);
    }
    if (this.inactive.size > MAX_DEVICES) {
      const oldest = this.inactive.keys().next().value;
      if (oldest !== undefined) {
        this.inactive.delete(oldest);
      }
    }
  }
}

export const takGroupActivity = new TakGroupActivity();
