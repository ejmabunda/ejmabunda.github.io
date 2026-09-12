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
              M
            </span>
            <span className="admin-wordmark-text">
              <span className="admin-wordmark-name">ejmabunda.dev</span>
              <span className="admin-wordmark-sub">admin console</span>
            </span>
          </span>
          <div>
            <h1 className="admin-login-statement">
              The content behind the site.
            </h1>
            <p className="admin-login-support">
              Profile, skills, experience, projects and credentials — edited
              here, live on the public site the moment the API answers.
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
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="admin-input-bare"
                  autoComplete="current-password"
                  autoFocus
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
              A backend redeploy regenerates the signing key, so an existing
              session lands back here once. Signing in again is the whole
              recovery.
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
