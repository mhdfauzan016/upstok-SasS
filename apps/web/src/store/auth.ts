import { create } from "zustand";
import { authService } from "@/services/auth.service";
import { tokenStore } from "@/lib/auth/token-store";

/**
 * Auth store backed by the Upstock API.
 *
 * Public surface is kept compatible with the original mock store so existing
 * components (AdminShell, admin.login) don't change shape:
 *   - `isAdmin`  : true when a tenant admin/owner session is active
 *   - `login`    : authenticate (now async — resolves to success boolean)
 *   - `logout`   : end the session
 *
 * The access token lives in memory (tokenStore); the refresh token is an
 * httpOnly cookie, so `bootstrap()` can silently restore a session on load.
 */
type AuthState = {
  isAdmin: boolean;
  /** True when a storefront customer session is active (scope `customer`). */
  isCustomer: boolean;
  ready: boolean;
  user: { id: string; name: string; email: string; role: string } | null;
  login: (email: string, password: string) => Promise<boolean>;
  /** Storefront customer login (scope `customer`). */
  loginCustomer: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  bootstrap: () => Promise<void>;
};

const TENANT_ADMIN_ROLES = new Set(["TENANT_OWNER", "TENANT_ADMIN", "STAFF"]);
const isCustomerRole = (role?: string) => role === "CUSTOMER";

export const useAuth = create<AuthState>()((set) => ({
  isAdmin: false,
  isCustomer: false,
  ready: false,
  user: null,

  login: async (email, password) => {
    try {
      const user = await authService.login({ email, password, scope: "tenant" });
      set({
        isAdmin: TENANT_ADMIN_ROLES.has(user.role),
        isCustomer: false,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      });
      return true;
    } catch {
      return false;
    }
  },

  loginCustomer: async (email, password) => {
    try {
      const user = await authService.login({ email, password, scope: "customer" });
      set({
        isCustomer: isCustomerRole(user.role),
        isAdmin: false,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      });
      return true;
    } catch {
      return false;
    }
  },

  logout: async () => {
    await authService.logout();
    set({ isAdmin: false, isCustomer: false, user: null });
  },

  bootstrap: async () => {
    const user = await authService.bootstrap();
    set({
      ready: true,
      isAdmin: !!user && TENANT_ADMIN_ROLES.has(user.role),
      isCustomer: !!user && isCustomerRole(user.role),
      user: user
        ? { id: user.id, name: user.name, email: user.email, role: user.role }
        : null,
    });
  },
}));

// Keep store flags in sync if the token is cleared elsewhere (e.g. failed refresh).
tokenStore.subscribe((token) => {
  if (!token) useAuth.setState({ isAdmin: false, isCustomer: false, user: null });
});
