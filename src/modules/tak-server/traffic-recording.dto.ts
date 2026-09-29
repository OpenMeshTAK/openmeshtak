/** Whether an event stores its TAK traffic, and for how long. Off by default. */
export interface TakTrafficRecordingDto {
  enabled: boolean;
  /** Recorded positions and markers are deleted after this many days. */
  retentionDays: number;
  /** Number of items currently stored for the event. */
  storedItems: number;
  /** Optimistic-concurrency version; 0 until first saved. */
  version: number;
}

export interface UpdateTakTrafficRecordingRequest {
  /**
   * @isInt
   * @minimum 0
   */
  version: number;
  enabled: boolean;
  /**
   * @isInt
   * @minimum 1
   * @maximum 365
   */
  retentionDays: number;
}
