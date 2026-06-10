"use client";

import type {
  AuthProvider as AuthProviderName,
  AuthResponse,
  AuthUser,
  RegisterWithEmailRequest,
  UserDto,
} from "@ai-stock-advisor/shared";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiRequest } from "../../lib/api";
import {
  loginWithGoogle as loginWithGoogleRequest,
  loginWithProvider as loginWithProviderRequest,
  registerWithEmail as registerWithEmailRequest,
} from "../../lib/auth-api";
import { normalizeProfileLanguage } from "../../lib/profile-language";
import { normalizeWatchlistViewMode } from "../../lib/watchlist-view-mode";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";
export type SessionUser = AuthUser &
  Partial<
    Pick<
      UserDto,
      "name" | "language" | "theme" | "watchlistViewMode" | "telegramChatId"
    >
  >;

interface AuthContextValue {
  status: AuthStatus;
  user: SessionUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithGoogle: (credential: string) => Promise<void>;
  loginWithGoogleCredential: (credential: string) => Promise<void>;
  loginWithProvider: (
    provider: AuthProviderName,
    payload: unknown,
  ) => Promise<void>;
  registerWithEmail: (payload: RegisterWithEmailRequest) => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (user: SessionUser | UserDto) => void;
  logout: () => void;
}

const authStorageKey = "ai-stock-advisor.accessToken";
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const logout = useCallback(() => {
    window.localStorage.removeItem(authStorageKey);
    setAccessToken(null);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const refreshUserWithToken = useCallback(
    async (token: string | null) => {
      if (!token) {
        logout();
        return;
      }

      const currentUser = await apiRequest<UserDto>("/users/me", {
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
      setUser(normalizeSessionUser(currentUser));
      setStatus("authenticated");
    },
    [logout],
  );

  const refreshUser = useCallback(async () => {
    await refreshUserWithToken(accessToken);
  }, [accessToken, refreshUserWithToken]);

  useEffect(() => {
    const storedToken = window.localStorage.getItem(authStorageKey);

    if (!storedToken) {
      setStatus("unauthenticated");
      return;
    }

    setAccessToken(storedToken);
    refreshUserWithToken(storedToken)
      .catch(() => {
        logout();
      });
  }, [logout, refreshUserWithToken]);

  const applyAuthResponse = useCallback((response: AuthResponse) => {
    window.localStorage.setItem(authStorageKey, response.accessToken);
    setAccessToken(response.accessToken);
    setUser(normalizeSessionUser(response.user));
    setStatus("authenticated");
  }, []);

  const loginWithGoogle = useCallback(async (credential: string) => {
    applyAuthResponse(await loginWithGoogleRequest(credential));
  }, [applyAuthResponse]);

  const loginWithProvider = useCallback(async (
    provider: AuthProviderName,
    payload: unknown,
  ) => {
    applyAuthResponse(await loginWithProviderRequest(provider, payload));
  }, [applyAuthResponse]);

  const registerWithEmail = useCallback(async (
    payload: RegisterWithEmailRequest,
  ) => {
    applyAuthResponse(await registerWithEmailRequest(payload));
  }, [applyAuthResponse]);

  const loginWithGoogleCredential = useCallback(async (credential: string) => {
    await loginWithGoogle(credential);
  }, [loginWithGoogle]);

  const updateUser = useCallback((nextUser: SessionUser | UserDto) => {
    setUser(normalizeSessionUser(nextUser));
  }, []);

  const isAuthenticated = status === "authenticated";
  const isLoading = status === "loading";

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      accessToken,
      isAuthenticated,
      isLoading,
      loginWithGoogle,
      loginWithGoogleCredential,
      loginWithProvider,
      registerWithEmail,
      refreshUser,
      updateUser,
      logout,
    }),
    [
      accessToken,
      isAuthenticated,
      isLoading,
      loginWithGoogle,
      loginWithGoogleCredential,
      loginWithProvider,
      registerWithEmail,
      logout,
      refreshUser,
      status,
      updateUser,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return value;
}

function normalizeSessionUser(user: AuthUser | UserDto): SessionUser {
  const sessionUser = user as SessionUser;

  return {
    ...sessionUser,
    language:
      sessionUser.language === undefined
        ? undefined
        : normalizeProfileLanguage(sessionUser.language),
    watchlistViewMode:
      sessionUser.watchlistViewMode === undefined
        ? undefined
        : normalizeWatchlistViewMode(sessionUser.watchlistViewMode),
  };
}
