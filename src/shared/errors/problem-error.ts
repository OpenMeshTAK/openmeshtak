export interface ProblemFieldError {
  field: string;
  code: string;
  message: string;
}

export interface ProblemErrorOptions {
  type: string;
  title: string;
  status: number;
  detail: string;
  code: string;
  errors?: ProblemFieldError[];
  /** Safe concurrency hint returned with `409` version conflicts. */
  currentVersion?: number;
}

export class ProblemError extends Error {
  public readonly type: string;
  public readonly title: string;
  public readonly status: number;
  public readonly code: string;
  public readonly errors: ProblemFieldError[] | undefined;
  public readonly currentVersion: number | undefined;

  public constructor(options: ProblemErrorOptions) {
    super(options.detail);
    this.name = "ProblemError";
    this.type = options.type;
    this.title = options.title;
    this.status = options.status;
    this.code = options.code;
    this.errors = options.errors;
    this.currentVersion = options.currentVersion;
  }
}

export function validationProblem(errors: ProblemFieldError[]): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:validation-failed",
    title: "Request validation failed",
    status: 422,
    detail: "One or more fields are invalid.",
    code: "VALIDATION_FAILED",
    errors,
  });
}

export function notFoundProblem(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:not-found",
    title: "Resource not found",
    status: 404,
    detail: "The requested resource does not exist.",
    code: "NOT_FOUND",
  });
}

export function versionConflictProblem(currentVersion: number): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:version-conflict",
    title: "Version conflict",
    status: 409,
    detail: "The resource was changed by another request. Reload it and try again.",
    code: "VERSION_CONFLICT",
    currentVersion,
  });
}
