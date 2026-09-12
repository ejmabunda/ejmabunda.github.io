"use client";

import { useState, type FormEvent } from "react";
import { InvalidPasswordError, login } from "@/lib/authApi";
import { useApiWaking } from "@/hooks/useApiWaking";
import AdminThemeToggle from "./AdminThemeToggle";

interface LoginFormProps {
  onSuccess: (token: string) => void;
}

type Status = "idle" | "loading" | "error";

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const waking = useApiWaking();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    try {
      const token = await login(password);
      onSuccess(token);
    } catch (err) {
      setErrorMessage(
        err instanceof InvalidPasswordError
          ? "That password didn't match."
          : "Something went wrong. Try again."
      );
      setStatus("error");
    }
  };

  const isError = status === "error";
  const isLoading = status === "loading";

  return (
    <div className="admin-page">
      <div className="admin-login">
        <div className="admin-login-brand">
          <span className="admin-wordmark">
            <span className="admin-wordmark-mark" aria-hidden="true">
              e
            </span>
            ejmabunda_
          </span>
          <div>
            <h1 className="admin-login-statement">
              The content behind the site.
            </h1>
            <p className="admin-login-support">
              Sign in to manage the profile, skills, experience, projects and
              credentials that power the public site.
            </p>
          </div>
          <div className="admin-login-footer">
            <span>api · southafricanorth-01</span>
            <span>auth · jwt + refresh cookie · 7d sliding</span>
            <span className="admin-login-footer-status">
              <span
                className="admin-status-dot"
                data-cold={waking}
                aria-hidden="true"
              />
              {waking ? "API waking…" : "API awake"}
            </span>
          </div>
        </div>

        <div className="admin-login-form">
          <div className="admin-login-form-inner">
            <h2 className="admin-h1">Sign in</h2>
            <p className="admin-subtext-tight">
              Single admin user. Password only.
            </p>

            <form onSubmit={handleSubmit}>
              <label className="admin-label" htmlFor="admin-password">
                Password
              </label>
              <div
                className={`admin-input-wrap${isError ? " is-error" : ""}`}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  className="admin-input-icon"
                  aria-hidden="true"
                >
                  <rect
                    x="3"
                    y="7"
                    width="10"
                    height="7"
                    rx="1.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.3"
                  />
                  <path
                    d="M5 7V5a3 3 0 0 1 6 0v2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.3"
                  />
                </svg>
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="admin-input-bare"
                  autoComplete="current-password"
                  readOnly={isLoading}
                  required
                />
                <button
                  type="button"
                  className="admin-show-toggle"
                  onClick={() => setShowPassword((s) => !s)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              {isError && (
                <div className="admin-error-banner">{errorMessage}</div>
              )}

              <button
                type="submit"
                className="admin-btn-primary"
                style={{ width: "100%", marginTop: 14 }}
                disabled={isLoading}
              >
                {isLoading && (
                  <span className="admin-spinner" aria-hidden="true" />
                )}
                {isLoading ? "Signing in…" : "Sign in"}
              </button>

              {isLoading && (
                <p className="admin-login-wake">
                  Waking the API. The free-tier instance takes 30–60 seconds
                  after an idle period; this can legitimately take a moment.
                </p>
              )}
            </form>

            <p className="admin-login-note">
              Sessions don&rsquo;t survive a redeploy of the API — sign in
              again if you land back here unexpectedly.
            </p>

            <div className="admin-login-theme">
              <AdminThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
