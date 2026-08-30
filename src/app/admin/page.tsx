"use client";

import { useCallback, useEffect, useState } from "react";
import LoginForm from "@/components/admin/LoginForm";
import ProfileEditor from "@/components/admin/ProfileEditor";
import { logout, refreshAccessToken } from "@/lib/authApi";

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  // The access token lives only in memory. On mount, try to mint a fresh one
  // from the HttpOnly refresh cookie so a returning admin skips the login form.
  useEffect(() => {
    let cancelled = false;
    refreshAccessToken()
      .then((fresh) => {
        if (!cancelled && fresh) setToken(fresh);
      })
      .catch(() => {
        // no usable session — fall through to the login form
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLoginSuccess = useCallback((newToken: string) => {
    setToken(newToken);
  }, []);

  const handleLoggedOut = useCallback(() => {
    void logout();
    setToken(null);
  }, []);

  return (
    <div className="admin-page">
      {checking ? null : token ? (
        <ProfileEditor
          token={token}
          onTokenRefreshed={setToken}
          onLoggedOut={handleLoggedOut}
        />
      ) : (
        <LoginForm onSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}
