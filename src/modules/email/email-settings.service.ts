import type { EmailSettings } from "../../generated/prisma/client.js";
import { recordAudit } from "../../shared/audit/audit.js";
import { requirePermission } from "../../shared/auth/permission-check.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { isUniqueConstraintError } from "../../shared/database/unique-constraint.js";
import { ProblemError, validationProblem, versionConflictProblem } from "../../shared/errors/problem-error.js";
import type { EmailSettingsDto, SendTestEmailRequest, SmtpSecurity, UpdateEmailSettingsRequest } from "./email-settings.dto.js";
import { EMAIL_SETTINGS_ID, encryptSmtpPassword, loadEmailSettings, sendEmail } from "./mailer.js";

function toDto(settings: EmailSettings | null): EmailSettingsDto {
  return {
    enabled: settings?.enabled ?? false,
    host: settings?.host ?? null,
    port: settings?.port ?? 587,
    security: (settings?.security ?? "starttls") as SmtpSecurity,
    username: settings?.username ?? null,
    passwordSet: (settings?.passwordEnvelope ?? null) !== null,
    fromAddress: settings?.fromAddress ?? null,
    fromName: settings?.fromName ?? "OpenMeshTak",
    version: settings?.version ?? 0,
  };
}

export async function getEmailSettings(principal: Principal): Promise<EmailSettingsDto> {
  await requirePermission(principal, "email.manage");
  return toDto(await loadEmailSettings());
}

function requiredWhenEnabled(input: UpdateEmailSettingsRequest): void {
  const missing = [
    input.host === null || input.host.trim() === "" ? "host" : null,
    input.fromAddress === null ? "fromAddress" : null,
  ].filter((field): field is string => field !== null);
  if (input.enabled && missing.length > 0) {
    throw validationProblem(missing.map((field) => ({ field, code: "REQUIRED", message: "Required to send email." })));
  }
}

/** Stores SMTP settings; the password is only replaced when the request contains one. */
export async function updateEmailSettings(actor: ActorContext, input: UpdateEmailSettingsRequest): Promise<EmailSettingsDto> {
  await requirePermission(actor.principal, "email.manage");
  requiredWhenEnabled(input);
  const data = {
    enabled: input.enabled,
    host: input.host?.trim() || null,
    port: input.port,
    security: input.security,
    username: input.username?.trim() || null,
    fromAddress: input.fromAddress,
    fromName: input.fromName,
    ...(input.password === undefined ? {} : { passwordEnvelope: input.password === null ? null : encryptSmtpPassword(input.password) }),
  };

  await database.$transaction(async (transaction) => {
    if (input.version === 0) {
      try {
        await transaction.emailSettings.create({ data: { id: EMAIL_SETTINGS_ID, ...data } });
      } catch (error: unknown) {
        throw isUniqueConstraintError(error) ? versionConflictProblem(toDto(await loadEmailSettings()).version) : error;
      }
    } else {
      const updated = await transaction.emailSettings.updateMany({
        where: { id: EMAIL_SETTINGS_ID, version: input.version },
        data: { ...data, version: { increment: 1 } },
      });
      if (updated.count !== 1) {
        throw versionConflictProblem(toDto(await loadEmailSettings()).version);
      }
    }
    await recordAudit(
      {
        actor: actor.principal,
        action: "email.settings-updated",
        targetType: "email-settings",
        targetId: EMAIL_SETTINGS_ID,
        result: "success",
        traceId: actor.traceId,
        metadata: { enabled: data.enabled, host: data.host, port: data.port, security: data.security, passwordChanged: input.password !== undefined },
      },
      transaction,
    );
  });
  return toDto(await loadEmailSettings());
}

/** Sends a test email so an administrator sees the SMTP settings work before users rely on them. */
export async function sendTestEmail(actor: ActorContext, input: SendTestEmailRequest): Promise<void> {
  await requirePermission(actor.principal, "email.manage");
  try {
    await sendEmail({
      to: input.to,
      subject: "OpenMeshTak test email",
      text: "This test email confirms that OpenMeshTak can send account emails with the configured SMTP settings.",
    });
  } catch (error: unknown) {
    // SMTP errors can contain server details but no secrets of ours; show a short, safe reason.
    const reason = error instanceof Error ? error.message.slice(0, 200) : "unknown error";
    throw new ProblemError({
      type: "urn:openmeshtak:problem:email-delivery-failed",
      title: "Test email failed",
      status: 502,
      detail: `The test email could not be sent: ${reason}`,
      code: "EMAIL_DELIVERY_FAILED",
    });
  }
  await recordAudit({
    actor: actor.principal,
    action: "email.test-sent",
    targetType: "email-settings",
    targetId: EMAIL_SETTINGS_ID,
    result: "success",
    traceId: actor.traceId,
  });
}
