/**
 * In-memory access-token holder. The access token is deliberately NOT persisted
 * to localStorage (XSS hygiene); the refresh token lives in an httpOnly cookie
 * set by the API and is replayed automatically via `credentials: "include"`.
 *
 * A tiny subscriber list lets the auth store react to token changes.
 */
let accessToken: string | null = null;
const listeners = new Set<(token: string | null) => void>();

export const tokenStore = {
  get: () => accessToken,
  set(token: string | null) {
    accessToken = token;
    listeners.forEach((fn) => fn(token));
  },
  clear() {
    this.set(null);
  },
  subscribe(fn: (token: string | null) => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
