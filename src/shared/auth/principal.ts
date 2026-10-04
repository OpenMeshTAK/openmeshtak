export interface UserPrincipal {
  type: "user";
  id: string;
  authSubjectId: string;
  /** When the Better Auth session was established; used for step-up checks. */
  sessionCreatedAt: Date;
}

export interface ApiClientPrincipal {
  type: "api-client";
  id: string;
  apiKeyId: string;
}

export type Principal = UserPrincipal | ApiClientPrincipal;

/** The authenticated caller plus request correlation, as passed from controllers to services. */
export interface ActorContext {
  principal: Principal;
  traceId: string;
}
