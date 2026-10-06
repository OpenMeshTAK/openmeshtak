import { Body, Controller, Get, Post, Put, Request, Response, Route, Security, SuccessResponse, Tags } from "@tsoa/runtime";
import type { ProblemDetails } from "../../shared/errors/problem.js";
import { requestContext } from "../../shared/http/request-context.js";
import type { EmailSettingsDto, SendTestEmailRequest, UpdateEmailSettingsRequest } from "./email-settings.dto.js";
import { getEmailSettings, sendTestEmail, updateEmailSettings } from "./email-settings.service.js";

/** SMTP delivery for account emails. Requires instance-wide `email.manage`. */
@Route("email/settings")
@Tags("Email")
@Security("sessionCookie")
@Response<ProblemDetails>(401, "Authentication required")
@Response<ProblemDetails>(403, "Access denied")
export class EmailSettingsController extends Controller {
  @Get()
  @SuccessResponse(200, "Email settings")
  public async getEmailSettings(@Request() request: unknown): Promise<EmailSettingsDto> {
    return getEmailSettings(requestContext(request).principal);
  }

  /** Replaces the settings. The SMTP password is write-only: omit it to keep the stored one. */
  @Put()
  @SuccessResponse(200, "Email settings updated")
  @Response<ProblemDetails>(409, "Version conflict")
  @Response<ProblemDetails>(422, "Validation failed")
  public async updateEmailSettings(@Request() request: unknown, @Body() body: UpdateEmailSettingsRequest): Promise<EmailSettingsDto> {
    return updateEmailSettings(requestContext(request), body);
  }

  /** Sends a test email with the stored settings. */
  @Post("test")
  @SuccessResponse(204, "Test email sent")
  @Response<ProblemDetails>(502, "Delivery failed")
  public async sendTestEmail(@Request() request: unknown, @Body() body: SendTestEmailRequest): Promise<void> {
    await sendTestEmail(requestContext(request), body);
    this.setStatus(204);
  }
}
