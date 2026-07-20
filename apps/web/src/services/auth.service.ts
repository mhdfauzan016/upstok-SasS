import { api } from "@/lib/api/client";
import { tokenStore } from "@/lib/auth/token-store";
import type {
  ApiAuthUser,
  ApiLoginResponse,
  ApiRefreshResponse,
  ApiScope,
} from "@/lib/api/types";

export interface LoginParams {
  email: string;
  password: string;
  scope: ApiScope;
}

/** Public customer self-registration (creates a `pending` account). */
export interface RegisterParams {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export const authService = {
  /** Authenticate; stores the access token in memory on success. */
  async login(params: LoginParams): Promise<ApiAuthUser> {
    const res = await api.post<ApiLoginResponse>("/auth/login", params, {
      auth: false,
    });
    tokenStore.set(res.accessToken);
    return res.user;
  },

  /**
   * Customer self-registration. Creates a `pending` account (no session) that a
   * tenant admin must approve before the customer can log in. Tenant is resolved
   * from the request host/header by the API.
   */
  async register(params: RegisterParams): Promise<void> {
    await api.post("/auth/register", params, { auth: false });
  },

  /** Restore a session from the httpOnly refresh cookie (e.g. on app load). */
  async bootstrap(): Promise<ApiAuthUser | null> {
    try {
      const refreshed = await api.post<ApiRefreshResponse>(
        "/auth/refresh",
        undefined,
        { auth: false },
      );
      tokenStore.set(refreshed.accessToken);
      return await api.get<ApiAuthUser>("/auth/me");
    } catch {
      tokenStore.clear();
      return null;
    }
  },

  async logout(): Promise<void> {
    try {
      await api.post("/auth/logout");
    } finally {
      tokenStore.clear();
    }
  },
};
