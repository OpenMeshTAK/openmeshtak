export interface UserPrincipal {
  type: "user";
  id: string;
  authSubjectId: string;
  /** When the Better Auth session was established; used for step-up checks. */
  sessionCreatedAt: Date;
}

export interface ServiceAccountPrincipal {
  type: "service-account";
  id: string;
  apiKeyId: string;
}

export type Principal = UserPrincipal | ServiceAccountPrincipal;

/** The authenticated caller plus request correlation, as passed from controllers to services. */
export interface ActorContext {
  principal: Principal;
  traceId: string;
}
