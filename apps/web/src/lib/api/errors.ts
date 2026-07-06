import type { ApiErrorBody } from "./types";

/** Normalized API error carrying the server's stable error code. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, body: Partial<ApiErrorBody> | undefined) {
    super(body?.message ?? `Request failed (${status})`);
    this.name = "ApiError";
    this.status = status;
    this.code = body?.code ?? "UNKNOWN";
    this.details = body?.details;
  }

  get isUnauthorized() {
    return this.status === 401;
  }
  get isTenantSuspended() {
    return this.code === "TENANT_SUSPENDED";
  }
  get isPlanLimit() {
    return this.code === "PLAN_LIMIT_EXCEEDED";
  }
}
