/**
 * Everything a TAK app needs to connect. Manual setup uses `username` with the account password;
 * the ATAK link and QR code carry a QR token instead, which is shown only in this response.
 */
export interface TakEnrollmentDto {
  /** The account username, the TAK login name. */
  username: string;
  /**
   * When the QR token expires: the end of the user's latest active event, otherwise in 30 days.
   * `null` without QR enrollment.
   * @format date-time
   */
  expiresAt: string | null;
  hostName: string;
  /** Public ports; they may differ from the listen ports inside the container. */
  enrollmentPort: number;
  /** Public Marti port for Data Packages; the enrollment profile also sets it in ATAK. */
  martiPort: number;
  streamingPort: number;
  /**
   * Link and QR code content for ATAK certificate enrollment, with the QR token. `null` while the
   * TAK server uses a certificate from its own CA, because ATAK's QR enrollment then fails.
   */
  atakEnrollmentUrl: string | null;
}
