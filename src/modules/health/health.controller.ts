import { Controller, Get, NoSecurity, Route, SuccessResponse, Tags } from "tsoa";

export interface HealthResponse {
  status: "ok";
  service: "openmeshtak";
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
      timestamp: new Date().toISOString(),
    };
  }
}
