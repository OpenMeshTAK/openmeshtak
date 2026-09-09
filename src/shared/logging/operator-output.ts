export interface BootstrapOperatorNotice {
  token: string;
  expiresAt: Date;
}

/**
 * Bootstrap credentials are delivered once to the local operator, not recorded as an
 * application log event. Keeping this exception inside the logging boundary prevents
 * feature modules from gaining a general-purpose unsanitized output path.
 */
export function writeBootstrapOperatorNotice(notice: BootstrapOperatorNotice): void {
  process.stderr.write(
    [
      "",
      "OpenMeshTak first-administrator setup is ready.",
      `Bootstrap token: ${notice.token}`,
      `Expires at: ${notice.expiresAt.toISOString()}`,
      "Enter this token in the local Web setup flow. It will not be shown again.",
      "",
    ].join("\n"),
  );
}
