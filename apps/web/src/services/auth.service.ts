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

export const authService = {
  /** Authenticate; stores the access token in memory on success. */
  async login(params: LoginParams): Promise<ApiAuthUser> {
    const res = await api.post<ApiLoginResponse>("/auth/login", params, {
      auth: false,
    });
    tokenStore.set(res.accessToken);
    return res.user;
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
