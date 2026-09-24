/**
 * Everything a TAK app needs to enroll once. The token is a single-use password valid for a few
 * minutes; it is shown only in this response.
 */
export interface TakEnrollmentDto {
  /** TAK user name: the stable OpenMeshTak user ID. */
  username: string;
  token: string;
  /** @format date-time */
  expiresAt: string;
  hostName: string;
  enrollmentPort: number;
  streamingPort: number;
  /** Link and QR code content for ATAK certificate enrollment. */
  atakEnrollmentUrl: string;
}
