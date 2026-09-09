export interface ProblemErrorOptions {
  type: string;
  title: string;
  status: number;
  detail: string;
  code: string;
}

export class ProblemError extends Error {
  public readonly type: string;
  public readonly title: string;
  public readonly status: number;
  public readonly code: string;

  public constructor(options: ProblemErrorOptions) {
    super(options.detail);
    this.name = "ProblemError";
    this.type = options.type;
    this.title = options.title;
    this.status = options.status;
    this.code = options.code;
  }
}
