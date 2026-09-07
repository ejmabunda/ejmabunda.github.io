"use client";

import Link from "next/link";
import { useState } from "react";
import ProfileEditor from "./ProfileEditor";
import SkillsManager from "./SkillsManager";
import ExperiencesManager from "./ExperiencesManager";

interface DashboardProps {
  token: string;
  onTokenRefreshed: (token: string) => void;
  onLoggedOut: () => void;
}

type Tab = "profile" | "skills" | "experience";

const TABS: { id: Tab; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "skills", label: "Skills" },
  { id: "experience", label: "Experience" },
];

export default function Dashboard({
  token,
  onTokenRefreshed,
  onLoggedOut,
}: DashboardProps) {
  const [tab, setTab] = useState<Tab>("profile");
  const [skillCount, setSkillCount] = useState<number | null>(null);
  const [roleCount, setRoleCount] = useState<number | null>(null);

  const handleLogOut = (e: React.MouseEvent) => {
    e.preventDefault();
    onLoggedOut();
  };

  const managerProps = { token, onTokenRefreshed, onLoggedOut };

  return (
    <div className="admin-shell">
      <div className="admin-shell-top">
        <Link href="/" className="admin-shell-link">
          ← back to site
        </Link>
        <button
          type="button"
          className="admin-shell-link"
          onClick={onLoggedOut}
        >
          log out
        </button>
      </div>

      <nav className="admin-tabrow" role="tablist" aria-label="Admin sections">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className="admin-tabrow-tab"
            data-active={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="admin-rail">
        <div className="admin-rail-wordmark">
          <span className="admin-rail-mark" aria-hidden="true">
            e
          </span>
          <span>
            <span className="admin-rail-brand">ejmabunda_</span>
            <span className="admin-rail-sub">admin</span>
          </span>
        </div>
        <span className="admin-rail-group">CONTENT</span>
        <div className="admin-nav" role="tablist" aria-label="Admin sections">
          {TABS.map(({ id, label }) => {
            const count = id === "skills" ? skillCount : id === "experience" ? roleCount : null;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className="admin-nav-item"
                data-active={tab === id}
                onClick={() => setTab(id)}
              >
                <span className="admin-nav-item-label">
                  <span className="admin-nav-dot" aria-hidden="true" />
                  {label}
                </span>
                {count !== null && (
                  <span className="admin-nav-count">{count}</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="admin-rail-spacer" />
        <div className="admin-rail-foot">
          <Link href="/" className="admin-shell-link">
            ← back to site
          </Link>
          <a href="#" className="admin-shell-link" onClick={handleLogOut}>
            log out
          </a>
        </div>
      </div>

      <div className="admin-main">
        {tab === "profile" && <ProfileEditor {...managerProps} />}
        {tab === "skills" && (
          <SkillsManager {...managerProps} onCountChange={setSkillCount} />
        )}
        {tab === "experience" && (
          <ExperiencesManager {...managerProps} onCountChange={setRoleCount} />
        )}
      </div>
    </div>
  );
}
