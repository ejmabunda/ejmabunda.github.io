"use client";

import { useState, type FormEvent } from "react";
import { InvalidPasswordError, login } from "@/lib/authApi";

interface LoginFormProps {
  onSuccess: (token: string) => void;
}

type Status = "idle" | "loading" | "error";

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

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
          ? "Wrong password. Try again."
          : "Something went wrong. Try again."
      );
      setStatus("error");
    }
  };

  const isError = status === "error";
  const isLoading = status === "loading";

  return (
    <div className="admin-screen-wrap">
      <div className="admin-login-card">
        <div className="admin-wordmark">ejmabunda_</div>
        <h1 className="admin-h1">Sign in</h1>
        <p className="admin-subtext">
          Enter the site password to manage your profile.
        </p>

        <form onSubmit={handleSubmit}>
          <label className="admin-label" htmlFor="admin-password">
            Password
          </label>
          <div className={`admin-input-wrap${isError ? " is-error" : ""}`}>
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
              className="admin-input"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="admin-show-toggle"
              onClick={() => setShowPassword((s) => !s)}
            >
              {showPassword ? "hide" : "show"}
            </button>
          </div>

          {isError && <div className="admin-error-banner">{errorMessage}</div>}

          <button
            type="submit"
            className="admin-btn-primary"
            disabled={isLoading}
          >
            {isLoading && <span className="admin-spinner" aria-hidden="true" />}
            {isLoading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
