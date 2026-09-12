"use client";

import { useState, type ReactNode } from "react";
import AdminThemeToggle from "./AdminThemeToggle";

interface AdminHeaderProps {
  title: string;
  endpoint: string;
  primaryAction?: ReactNode;
  waking: boolean;
  onLoggedOut: () => void;
}

/**
 * Sticky page header used by every record-type screen: title + endpoint,
 * theme toggle, a link back to the public site, and the screen's primary
 * action. Below 900px the rail (and its sign-out / API status) is hidden, so
 * a "more" button surfaces those here instead. Renders the cold-start wake
 * banner directly beneath itself when the API is waking up.
 */
export default function AdminHeader({
  title,
  endpoint,
  primaryAction,
  waking,
  onLoggedOut,
}: AdminHeaderProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <header className="admin-header">
        <div className="admin-header-titles">
          <span className="admin-page-title">{title}</span>
          <span className="admin-endpoint admin-mono">{endpoint}</span>
        </div>
        <div className="admin-header-actions">
          <AdminThemeToggle />
          <a
            className="admin-view-site"
            href="/"
            target="_blank"
            rel="noopener noreferrer"
          >
            View site ↗
          </a>
          {primaryAction}
          <div className="admin-header-more">
            <button
              type="button"
              className="admin-header-more-btn"
              aria-label="More"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((o) => !o)}
            >
              ⋯
            </button>
            {moreOpen && (
              <div className="admin-header-more-panel">
                <span className="admin-header-more-status">
                  <span
                    className="admin-status-dot"
                    data-cold={waking}
                    aria-hidden="true"
                  />
                  {waking ? "API waking…" : "API awake"}
                </span>
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={onLoggedOut}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      {waking && (
        <div className="admin-wake-banner" role="status" aria-live="polite">
          <span className="admin-wake-banner-dot" aria-hidden="true" />
          <span>
            Waking the API. The free-tier instance takes 30–60 seconds after
            an idle period; writes are queued until it answers.
          </span>
        </div>
      )}
    </>
  );
}
