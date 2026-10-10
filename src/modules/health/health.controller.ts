import { Controller, Get, NoSecurity, Route, SuccessResponse, Tags } from "@tsoa/runtime";
import { coreVersion } from "./core-version.js";

export interface HealthResponse {
  status: "ok";
  service: "openmeshtak";
  /**
   * Core release version. Core and Web are released together: a Web app works with every Core of
   * the same major and minor version and warns otherwise.
   * @example "0.1.0"
   */
  version: string;
  timestamp: string;
}

@Route("health")
@Tags("Operations")
@NoSecurity()
export class HealthController extends Controller {
  /** Reports that the API process completed startup, including its database connection. */
  @Get()
  @SuccessResponse(200, "Healthy")
  public getHealth(): HealthResponse {
    return {
      status: "ok",
      service: "openmeshtak",
      version: coreVersion,
      timestamp: new Date().toISOString(),
    };
  }
}
