"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  createExperience,
  deleteExperience,
  getExperiencesFresh,
  updateExperience,
  UnauthorizedError,
  type Experience,
} from "@/lib/experienceApi";
import {
  getSkillsFresh,
  CATEGORY_LABEL,
  SKILL_CATEGORY_NAMES,
  type Skill,
} from "@/lib/skillApi";
import { refreshAccessToken } from "@/lib/authApi";
import DeleteConfirmModal from "./DeleteConfirmModal";

interface ExperiencesManagerProps {
  token: string;
  onTokenRefreshed: (token: string) => void;
  onLoggedOut: () => void;
  onCountChange?: (count: number) => void;
}

type LoadStatus = "loading" | "loaded" | "error";
type MobileView = "list" | "editor";

const BLANK = {
  jobTitle: "",
  employer: "",
  startDate: "",
  endDate: "",
  description: "",
};

function byStartDateDesc(a: Experience, b: Experience): number {
  return b.startDate.localeCompare(a.startDate);
}

/** `"2026-02-02T00:00:00"` → `"2026-02-02"` for a native date input. */
function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

/** `"2026-02-02T00:00:00"` → `"2026-02"` for the compact meta line. */
function yearMonth(iso: string): string {
  return iso.slice(0, 7);
}

export default function ExperiencesManager({
  token,
  onTokenRefreshed,
  onLoggedOut,
  onCountChange,
}: ExperiencesManagerProps) {
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [banner, setBanner] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK);
  const [pickedSkillIds, setPickedSkillIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Experience | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>("list");

  function commit(next: Experience[]) {
    const sorted = [...next].sort(byStartDateDesc);
    setExperiences(sorted);
    onCountChange?.(sorted.length);
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([getExperiencesFresh(), getSkillsFresh()])
      .then(([exps, sks]) => {
        if (cancelled) return;
        commit(exps);
        setSkills(sks);
        setLoadStatus("loaded");
      })
      .catch(() => {
        if (cancelled) return;
        setLoadStatus("error");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skillGroups = useMemo(
    () =>
      SKILL_CATEGORY_NAMES.map((name) => ({
        name,
        label: CATEGORY_LABEL[name],
        items: skills
          .filter((s) => s.skillCategory === name)
          .sort((a, b) => a.name.localeCompare(b.name)),
      })).filter((g) => g.items.length > 0),
    [skills]
  );

  async function runAuthed<T>(call: (token: string) => Promise<T>): Promise<T> {
    try {
      return await call(token);
    } catch (err) {
      if (!(err instanceof UnauthorizedError)) throw err;
      const fresh = await refreshAccessToken();
      if (!fresh) throw err;
      onTokenRefreshed(fresh);
      return call(fresh);
    }
  }

  function handleAuthError(err: unknown): boolean {
    if (err instanceof UnauthorizedError) {
      onLoggedOut();
      return true;
    }
    return false;
  }

  function selectRole(exp: Experience) {
    setSelectedId(exp.id);
    setForm({
      jobTitle: exp.jobTitle,
      employer: exp.employer,
      startDate: toDateInput(exp.startDate),
      endDate: toDateInput(exp.endDate),
      description: exp.description,
    });
    setPickedSkillIds(exp.skills.map((s) => s.id));
    setBanner(null);
    setMobileView("editor");
  }

  function newRole() {
    setSelectedId(null);
    setForm(BLANK);
    setPickedSkillIds([]);
    setBanner(null);
    setMobileView("editor");
  }

  function toggleSkill(id: string) {
    setPickedSkillIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const isEditing = selectedId !== null;
  const canSubmit =
    form.jobTitle.trim() !== "" &&
    form.employer.trim() !== "" &&
    form.startDate !== "" &&
    form.description.trim() !== "" &&
    !saving;

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setBanner(null);
    const payload = {
      jobTitle: form.jobTitle.trim(),
      employer: form.employer.trim(),
      startDate: form.startDate,
      endDate: form.endDate || null,
      description: form.description
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .join("\n"),
      skillIds: pickedSkillIds,
    };
    try {
      if (selectedId) {
        const updated = await runAuthed((t) =>
          updateExperience(t, selectedId, payload)
        );
        commit(experiences.map((x) => (x.id === updated.id ? updated : x)));
      } else {
        const created = await runAuthed((t) => createExperience(t, payload));
        commit([created, ...experiences]);
        newRole();
      }
      setMobileView("list");
    } catch (err) {
      if (handleAuthError(err)) return;
      setBanner(
        selectedId
          ? "Couldn't save that role. Try again."
          : "Couldn't add that role. Try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setBanner(null);
    try {
      await runAuthed((t) => deleteExperience(t, deleteTarget.id));
      commit(experiences.filter((x) => x.id !== deleteTarget.id));
      if (selectedId === deleteTarget.id) newRole();
      setDeleteTarget(null);
      setMobileView("list");
    } catch (err) {
      if (handleAuthError(err)) return;
      setBanner("Couldn't delete that role. Try again.");
    } finally {
      setDeleting(false);
    }
  };

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const primaryLabel = saving
    ? "Saving…"
    : isEditing
    ? "Save role"
    : "Add experience";

  const editorCard = (
    <div className="admin-card" style={{ padding: "26px 26px 26px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 22,
        }}
      >
        <div className="admin-card-lead">
          <h3 className="admin-h2">{isEditing ? "Edit role" : "Add a role"}</h3>
          <p className="admin-subtext" style={{ margin: 0 }}>
            {isEditing
              ? "Editing an existing entry. Saving updates it on your site immediately."
              : "Roles shown on your site's timeline. New entries go live immediately."}
          </p>
        </div>
        {isEditing && (
          <div style={{ display: "flex", gap: 8, flex: "none" }}>
            <button
              type="button"
              className="admin-btn-mini"
              data-tone="danger"
              onClick={() => {
                const target = experiences.find((x) => x.id === selectedId);
                if (target) setDeleteTarget(target);
              }}
            >
              Delete
            </button>
            <button type="button" className="admin-btn-mini" onClick={newRole}>
              Cancel edit
            </button>
          </div>
        )}
      </div>

      {banner && (
        <div className="admin-error-banner">{banner}</div>
      )}

      <form id="admin-exp-form" onSubmit={handleSubmit}>
        <div className="admin-field-grid-2">
          <div className="admin-field">
            <label className="admin-label" htmlFor="exp-title">
              Job title
            </label>
            <input
              id="exp-title"
              type="text"
              className="admin-input-plain"
              value={form.jobTitle}
              onChange={(e) => set("jobTitle", e.target.value)}
              placeholder="Software Developer"
            />
          </div>
          <div className="admin-field">
            <label className="admin-label" htmlFor="exp-employer">
              Employer
            </label>
            <input
              id="exp-employer"
              type="text"
              className="admin-input-plain"
              value={form.employer}
              onChange={(e) => set("employer", e.target.value)}
              placeholder="Xiquel"
            />
          </div>
          <div className="admin-field">
            <label className="admin-label" htmlFor="exp-start">
              Start date
            </label>
            <input
              id="exp-start"
              type="date"
              className="admin-input-plain"
              value={form.startDate}
              onChange={(e) => set("startDate", e.target.value)}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label" htmlFor="exp-end">
              End date{" "}
              <span className="admin-faint">(optional)</span>
            </label>
            <input
              id="exp-end"
              type="date"
              className="admin-input-plain"
              value={form.endDate}
              min={form.startDate || undefined}
              onChange={(e) => set("endDate", e.target.value)}
            />
          </div>
          <div className="admin-field admin-field-full">
            <label className="admin-label" htmlFor="exp-description">
              Description{" "}
              <span className="admin-faint">— one bullet per line</span>
            </label>
            <textarea
              id="exp-description"
              className="admin-textarea"
              style={{ minHeight: 92 }}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder={"Led backend development for…\nBuilt an automated…"}
            />
          </div>
        </div>

        <div className="admin-pillset">
          <div className="admin-pillset-head">
            <span className="admin-label" style={{ margin: 0 }}>
              Skills used
            </span>
            <span className="admin-pillset-count">
              {pickedSkillIds.length} selected
            </span>
          </div>
          {skillGroups.length === 0 ? (
            <p className="admin-subtext" style={{ margin: 0 }}>
              Add skills under the Skills tab first — roles link to them.
            </p>
          ) : (
            skillGroups.map((group) => (
              <div key={group.name} className="admin-pillset-group">
                <span className="admin-pillset-group-label">
                  {group.label.toUpperCase()}
                </span>
                <div className="admin-pillset-items">
                  {group.items.map((skill) => (
                    <button
                      key={skill.id}
                      type="button"
                      className="admin-toggle-pill"
                      data-on={pickedSkillIds.includes(skill.id)}
                      onClick={() => toggleSkill(skill.id)}
                    >
                      {skill.name}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <button
          type="submit"
          className="admin-btn-action admin-exp-submit"
          style={{ width: "100%", marginTop: 24 }}
          disabled={!canSubmit}
        >
          {saving && <span className="admin-spinner" aria-hidden="true" />}
          {primaryLabel}
        </button>
      </form>
    </div>
  );

  const timelineAside = (
    <aside className="admin-context">
      <div className="admin-timeline">
        <div className="admin-timeline-head">
          <span className="admin-context-label" style={{ margin: 0 }}>
            TIMELINE · {experiences.length}
          </span>
          <button
            type="button"
            className="admin-btn-mini"
            data-tone="accent"
            onClick={newRole}
          >
            + New
          </button>
        </div>
        <div className="admin-timeline-scroll">
          {experiences.length === 0 ? (
            <p className="admin-subtext" style={{ padding: 18, margin: 0 }}>
              No roles yet.
            </p>
          ) : (
            experiences.map((exp) => {
              const active = selectedId === exp.id;
              return (
                <button
                  key={exp.id}
                  type="button"
                  className="admin-timeline-row"
                  data-active={active}
                  onClick={() => selectRole(exp)}
                >
                  <span className="admin-timeline-mark" aria-hidden="true" />
                  <span className="admin-timeline-body">
                    <span className="admin-timeline-title">
                      {exp.jobTitle}
                    </span>
                    <span className="admin-timeline-meta">
                      {exp.employer} · {yearMonth(exp.startDate)} –{" "}
                      {exp.endDate ? yearMonth(exp.endDate) : "present"}
                    </span>
                    {active && (
                      <span className="admin-timeline-editrow">
                        <span className="admin-editing-chip">editing</span>
                      </span>
                    )}
                  </span>
                  <span className="admin-timeline-chevron" aria-hidden="true">
                    ›
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
      <div className="admin-note-dashed">
        Pick a role to load it into the editor. Changes save straight to your
        site.
      </div>
    </aside>
  );

  return (
    <>
      <div className="admin-actionbar">
        <div className="admin-actionbar-title">
          Experience
          <span className="admin-pill">{experiences.length} live</span>
        </div>
        <span className="admin-actionbar-status">
          {experiences.length} role{experiences.length === 1 ? "" : "s"} · newest
          first
        </span>
        <div className="admin-actionbar-actions">
          <button
            type="button"
            className="admin-btn-action"
            disabled={!canSubmit || loadStatus !== "loaded"}
            onClick={() => handleSubmit()}
          >
            {saving && <span className="admin-spinner" aria-hidden="true" />}
            {primaryLabel}
          </button>
        </div>
      </div>

      <div className="admin-body">
        {loadStatus === "loading" && <p className="admin-subtext">Loading…</p>}

        {loadStatus === "error" && (
          <p className="admin-subtext">
            Something went wrong loading your experience. Refresh to try again.
          </p>
        )}

        {loadStatus === "loaded" && (
          <div
            className="admin-content-grid"
            data-mobile-view={mobileView}
          >
            <div data-exp-pane="editor">{editorCard}</div>
            <div data-exp-pane="list">
              <div className="admin-exp-mobile-back">
                <button
                  type="button"
                  className="admin-shell-link"
                  onClick={() => setMobileView("list")}
                >
                  ← timeline
                </button>
              </div>
              {timelineAside}
            </div>
          </div>
        )}
      </div>

      {deleteTarget && (
        <DeleteConfirmModal
          deleting={deleting}
          title={`Delete "${deleteTarget.jobTitle}"?`}
          body="This removes the role from your site's timeline. This can't be undone."
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}
