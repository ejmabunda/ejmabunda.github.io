"use client";

import { useCallback, useEffect, useState } from "react";
import LoginForm from "@/components/admin/LoginForm";
import ProfileEditor from "@/components/admin/ProfileEditor";
import {
  clearStoredToken,
  getStoredToken,
  setStoredToken,
} from "@/lib/authApi";

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);

  // Reading sessionStorage must happen after mount (it isn't available
  // during server rendering), so the first paint always assumes logged-out.
  useEffect(() => {
    setToken(getStoredToken());
  }, []);

  const handleLoginSuccess = useCallback((newToken: string) => {
    setStoredToken(newToken);
    setToken(newToken);
  }, []);

  const handleLoggedOut = useCallback(() => {
    clearStoredToken();
    setToken(null);
  }, []);

  return (
    <div className="admin-page">
      {token ? (
        <ProfileEditor token={token} onLoggedOut={handleLoggedOut} />
      ) : (
        <LoginForm onSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}
