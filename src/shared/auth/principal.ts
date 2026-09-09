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
