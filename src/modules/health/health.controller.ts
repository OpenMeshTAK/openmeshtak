import { readFileSync } from "node:fs";
import { Controller, Get, NoSecurity, Route, SuccessResponse, Tags } from "@tsoa/runtime";

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

// package.json sits three levels above this file both in src/ and in the built dist/.
const { version } = JSON.parse(readFileSync(new URL("../../../package.json", import.meta.url), "utf8")) as { version: string };

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
      version,
      timestamp: new Date().toISOString(),
    };
  }
}
