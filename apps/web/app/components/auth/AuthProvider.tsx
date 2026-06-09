"use client";

import type { AuthResponse, UserDto } from "@ai-stock-advisor/shared";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiRequest } from "../../lib/api";
import { normalizeProfileLanguage } from "../../lib/profile-language";
import { normalizeWatchlistViewMode } from "../../lib/watchlist-view-mode";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: UserDto | null;
  accessToken: string | null;
  loginWithGoogleCredential: (credential: string) => Promise<void>;
  updateUser: (user: UserDto) => void;
  logout: () => void;
}

const authStorageKey = "ai-stock-advisor.accessToken";
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<UserDto | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const logout = useCallback(() => {
    window.localStorage.removeItem(authStorageKey);
    setAccessToken(null);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  useEffect(() => {
    const storedToken = window.localStorage.getItem(authStorageKey);

    if (!storedToken) {
      setStatus("unauthenticated");
      return;
    }

    setAccessToken(storedToken);
    apiRequest<UserDto>("/users/me", {
      headers: {
        authorization: `Bearer ${storedToken}`,
      },
    })
      .then((currentUser) => {
        setUser(normalizeUser(currentUser));
        setStatus("authenticated");
      })
      .catch(() => {
        logout();
      });
  }, [logout]);

  const loginWithGoogleCredential = useCallback(async (credential: string) => {
    const response = await apiRequest<AuthResponse>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential }),
    });

    window.localStorage.setItem(authStorageKey, response.accessToken);
    setAccessToken(response.accessToken);
    setUser(normalizeUser(response.user));
    setStatus("authenticated");
  }, []);

  const updateUser = useCallback((nextUser: UserDto) => {
    setUser(normalizeUser(nextUser));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      accessToken,
      loginWithGoogleCredential,
      updateUser,
      logout,
    }),
    [accessToken, loginWithGoogleCredential, logout, status, updateUser, user],
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

function normalizeUser(user: UserDto): UserDto {
  return {
    ...user,
    language: normalizeProfileLanguage(user.language),
    watchlistViewMode: normalizeWatchlistViewMode(user.watchlistViewMode),
  };
}
