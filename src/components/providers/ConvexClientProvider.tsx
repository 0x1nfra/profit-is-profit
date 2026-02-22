"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithAuth } from "convex/react";
import { useCallback, useMemo, useState, useEffect } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Reads the pisp-convex-token cookie (non-httpOnly) from document.cookie.
 * Returns null if not found or if the JWT is expired.
 */
function getConvexTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("pisp-convex-token="));

  if (!match) return null;

  const token = match.split("=")[1];
  if (!token) return null;

  // Check JWT expiry by parsing the payload (no crypto needed — just base64 decode)
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const expMs = payload.exp * 1000;
    if (Date.now() >= expMs) return null; // Expired
  } catch {
    return null; // Malformed JWT
  }

  return token;
}

function useConvexAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Read token from cookie on mount and when cookies change
  useEffect(() => {
    const cookieToken = getConvexTokenFromCookie();
    setToken(cookieToken);
    setIsLoading(false);
  }, []);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      // 7-day JWTs: re-read cookie to pick up fresh tokens after re-auth
      const cookieToken = getConvexTokenFromCookie();
      if (forceRefreshToken || cookieToken !== token) {
        setToken(cookieToken);
      }
      return cookieToken;
    },
    [token]
  );

  return useMemo(
    () => ({
      isLoading,
      isAuthenticated: token !== null,
      fetchAccessToken,
    }),
    [isLoading, token, fetchAccessToken]
  );
}

export function ConvexClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useConvexAuth}>
      {children}
    </ConvexProviderWithAuth>
  );
}
