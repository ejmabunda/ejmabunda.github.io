"use client";

import Link from "next/link";
import { useState } from "react";
import ProfileEditor from "./ProfileEditor";
import SkillsManager from "./SkillsManager";

interface DashboardProps {
  token: string;
  onTokenRefreshed: (token: string) => void;
  onLoggedOut: () => void;
}

type Tab = "profile" | "skills";

export default function Dashboard({
  token,
  onTokenRefreshed,
  onLoggedOut,
}: DashboardProps) {
  const [tab, setTab] = useState<Tab>("profile");

  const handleLogOut = (e: React.MouseEvent) => {
    e.preventDefault();
    onLoggedOut();
  };

  return (
    <div className="admin-screen-wrap">
      <div className="admin-top-bar">
        <Link href="/" className="admin-top-link">
          ← back to site
        </Link>
        <a href="#" className="admin-top-link" onClick={handleLogOut}>
          log out
        </a>
      </div>

      <div className="admin-tabs" role="tablist" aria-label="Admin sections">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "profile"}
          className="admin-tab"
          data-active={tab === "profile"}
          onClick={() => setTab("profile")}
        >
          Profile
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "skills"}
          className="admin-tab"
          data-active={tab === "skills"}
          onClick={() => setTab("skills")}
        >
          Skills
        </button>
      </div>

      {tab === "profile" ? (
        <ProfileEditor
          embedded
          token={token}
          onTokenRefreshed={onTokenRefreshed}
          onLoggedOut={onLoggedOut}
        />
      ) : (
        <SkillsManager
          token={token}
          onTokenRefreshed={onTokenRefreshed}
          onLoggedOut={onLoggedOut}
        />
      )}
    </div>
  );
}
