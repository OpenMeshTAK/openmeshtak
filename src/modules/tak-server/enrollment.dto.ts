/**
 * Everything a TAK app needs to connect. Manual setup uses `username` with the account password;
 * the ATAK link and QR code carry a QR token instead, which is shown only in this response.
 */
export interface TakEnrollmentDto {
  /** The account username, the TAK login name. */
  username: string;
  /**
   * When the QR token expires: the end of the user's latest active event, otherwise in 30 days.
   * @format date-time
   */
  expiresAt: string;
  hostName: string;
  enrollmentPort: number;
  streamingPort: number;
  /** Link and QR code content for ATAK certificate enrollment, with the QR token. */
  atakEnrollmentUrl: string;
}
