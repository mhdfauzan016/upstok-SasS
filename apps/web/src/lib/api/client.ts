import { tokenStore } from "../auth/token-store";
import { resolveTenantSlug } from "../tenant/resolve";
import { API_BASE_URL } from "./config";
import { ApiError } from "./errors";
import type { ApiErrorBody } from "./types";

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  /** Skip the Authorization header (public + auth endpoints). */
  auth?: boolean;
  /** Skip the automatic 401 → refresh → retry once. */
  skipRefresh?: boolean;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(
    `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`,
  );
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function parseBody(res: Response): Promise<unknown> {
  if (res.status === 204) return undefined;
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

let refreshing: Promise<boolean> | null = null;

/** Single-flight refresh: concurrent 401s share one /auth/refresh call. */
async function tryRefresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetch(buildUrl("/auth/refresh"), {
          method: "POST",
          credentials: "include",
          headers: { "X-Tenant-Slug": resolveTenantSlug() },
        });
        if (!res.ok) return false;
        const data = (await parseBody(res)) as { accessToken?: string };
        if (data?.accessToken) {
          tokenStore.set(data.accessToken);
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, auth = true, skipRefresh = false } = opts;

  // FormData bodies (file uploads) must NOT be JSON-encoded; the browser sets
  // the multipart Content-Type (with boundary) itself.
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  const headers: Record<string, string> = {
    "X-Tenant-Slug": resolveTenantSlug(),
  };
  if (body !== undefined && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const token = tokenStore.get();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(buildUrl(path, query), {
    method,
    headers,
    credentials: "include",
    body:
      body === undefined
        ? undefined
        : isFormData
          ? (body as FormData)
          : JSON.stringify(body),
    signal: opts.signal,
  });

  // Silent refresh on expired access token, then retry once.
  if (res.status === 401 && auth && !skipRefresh && tokenStore.get()) {
    const ok = await tryRefresh();
    if (ok) return request<T>(path, { ...opts, skipRefresh: true });
  }

  if (!res.ok) {
    const errBody = (await parseBody(res)) as ApiErrorBody | undefined;
    throw new ApiError(res.status, errBody);
  }

  return (await parseBody(res)) as T;
}

export const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "PATCH", body }),
  delete: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "DELETE" }),
};
