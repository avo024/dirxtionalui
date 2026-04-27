import { useCallback, useEffect } from "react";
import { setAuthTokenProvider } from "@/lib/api";
import { getIdToken } from "@/lib/cognito";

/**
 * useApi — bridges Cognito ID tokens into the API layer.
 * On mount, registers a token provider so all api.ts calls automatically
 * include `Authorization: Bearer <token>` without changing call sites.
 */
export function useApi() {
  const getToken = useCallback(async (): Promise<string | undefined> => {
    return getIdToken();
  }, []);

  // Register the provider so api.ts can pull a fresh token on every request.
  // Do NOT clear on unmount — clearing briefly nulls the provider during
  // re-renders and re-triggers the tokenReady wait, causing 401s.
  useEffect(() => {
    setAuthTokenProvider(getToken);
  }, [getToken]);

  return { getToken };
}
