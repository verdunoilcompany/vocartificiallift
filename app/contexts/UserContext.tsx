"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";
import type { UserResponse } from "@/types/user";

interface UserContextType {
  username: string | null;
  authenticated: boolean;
  source: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(apiUrl("/api/user"));
      if (!response.ok) {
        throw new Error("Failed to fetch user");
      }
      const data = (await response.json()) as UserResponse;
      setUsername(data.username || null);
      setAuthenticated(data.authenticated || false);
      setSource(data.source || null);
    } catch (err) {
      console.error("Error fetching user:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setUsername(null);
      setAuthenticated(false);
      setSource(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUser();
  }, [fetchUser]);

  return (
    <UserContext.Provider
      value={{
        username,
        authenticated,
        source,
        isLoading,
        error,
        refetch: fetchUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
