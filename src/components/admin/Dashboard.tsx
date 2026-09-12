"use client";

import { useState } from "react";
import { useApiWaking } from "@/hooks/useApiWaking";
import ProfileEditor from "./ProfileEditor";
import SkillsManager from "./SkillsManager";
import ExperiencesManager from "./ExperiencesManager";
import ProjectsManager from "./ProjectsManager";
import QualificationsManager from "./QualificationsManager";
import CertificationsManager from "./CertificationsManager";

interface DashboardProps {
  token: string;
  onTokenRefreshed: (token: string) => void;
  onLoggedOut: () => void;
}

type Tab =
  | "profile"
  | "skills"
  | "experience"
  | "projects"
  | "qualifications"
  | "certifications";

const CONTENT_TABS: { id: Tab; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "skills", label: "Skills" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
];

const CREDENTIAL_TABS: { id: Tab; label: string }[] = [
  { id: "qualifications", label: "Qualifications" },
  { id: "certifications", label: "Certifications" },
];

const ADMIN_NAME = "Matimu Mabunda";
const ADMIN_INITIALS = "MM";

const ALL_TABS = [...CONTENT_TABS, ...CREDENTIAL_TABS];

export default function Dashboard({
  token,
  onTokenRefreshed,
  onLoggedOut,
}: DashboardProps) {
  const [tab, setTab] = useState<Tab>("profile");
  const [counts, setCounts] = useState<Partial<Record<Tab, number>>>({});
  const waking = useApiWaking();

  const managerProps = { token, onTokenRefreshed, onLoggedOut, waking };

  const reportCount = (id: Tab) => (n: number) =>
    setCounts((prev) => (prev[id] === n ? prev : { ...prev, [id]: n }));

  const handleLogOut = (e: React.MouseEvent) => {
    e.preventDefault();
    onLoggedOut();
  };

  return (
    <div className="admin-page">
      <div className="admin-shell">
        <nav
          className="admin-tabrow"
          role="tablist"
          aria-label="Admin sections"
        >
          {ALL_TABS.map(({ id, label }) => (
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
          <div className="admin-rail-brand">
            <span className="admin-rail-mark" aria-hidden="true">
              M
            </span>
            <span>
              <span className="admin-rail-brand-name">ejmabunda.dev</span>
              <span className="admin-rail-brand-sub">admin console</span>
            </span>
          </div>

          <span className="admin-rail-group">CONTENT</span>
          <div className="admin-nav" role="tablist" aria-label="Content">
            {CONTENT_TABS.map(({ id, label }) => (
              <RailItem
                key={id}
                id={id}
                label={label}
                active={tab === id}
                count={counts[id] ?? null}
                onSelect={setTab}
              />
            ))}
          </div>

          <span className="admin-rail-group">CREDENTIALS</span>
          <div className="admin-nav" role="tablist" aria-label="Credentials">
            {CREDENTIAL_TABS.map(({ id, label }) => (
              <RailItem
                key={id}
                id={id}
                label={label}
                active={tab === id}
                count={counts[id] ?? null}
                onSelect={setTab}
              />
            ))}
          </div>

          <div className="admin-rail-spacer" />

          <div className="admin-rail-status" data-cold={waking}>
            <span
              className="admin-status-dot"
              data-cold={waking}
              aria-hidden="true"
            />
            <span className="admin-rail-status-text">
              <span>{waking ? "API waking…" : "API awake"}</span>
              <span>token · 6d left</span>
            </span>
          </div>
          <button
            type="button"
            className="admin-rail-user"
            onClick={handleLogOut}
          >
            <span className="admin-rail-user-avatar" aria-hidden="true">
              {ADMIN_INITIALS}
            </span>
            <span className="admin-rail-user-info">
              <span>{ADMIN_NAME}</span>
              <span>Sign out</span>
            </span>
          </button>
        </div>

        <div className="admin-main">
          {tab === "profile" && <ProfileEditor {...managerProps} />}
          {tab === "skills" && (
            <SkillsManager
              {...managerProps}
              onCountChange={reportCount("skills")}
            />
          )}
          {tab === "experience" && (
            <ExperiencesManager
              {...managerProps}
              onCountChange={reportCount("experience")}
            />
          )}
          {tab === "projects" && (
            <ProjectsManager
              {...managerProps}
              onCountChange={reportCount("projects")}
            />
          )}
          {tab === "qualifications" && (
            <QualificationsManager
              {...managerProps}
              onCountChange={reportCount("qualifications")}
            />
          )}
          {tab === "certifications" && (
            <CertificationsManager
              {...managerProps}
              onCountChange={reportCount("certifications")}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function RailItem({
  id,
  label,
  active,
  count,
  onSelect,
}: {
  id: Tab;
  label: string;
  active: boolean;
  count: number | null;
  onSelect: (id: Tab) => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className="admin-nav-item"
      data-active={active}
      onClick={() => onSelect(id)}
    >
      <span className="admin-nav-item-label">
        <span className="admin-nav-icon" data-icon={id} aria-hidden="true" />
        {label}
      </span>
      {count !== null && <span className="admin-nav-count">{count}</span>}
    </button>
  );
}
