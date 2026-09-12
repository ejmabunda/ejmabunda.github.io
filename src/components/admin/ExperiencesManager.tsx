"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
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
import { runAuthed } from "@/lib/runAuthed";
import AdminHeader from "./AdminHeader";
import DeleteConfirmModal from "./DeleteConfirmModal";
import SkillPicker from "./SkillPicker";

interface ExperiencesManagerProps {
  token: string;
  onTokenRefreshed: (token: string) => void;
  onLoggedOut: () => void;
  waking: boolean;
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

/** `"2026-02-02T00:00:00"` → `"Mar 2023"` for the list's period column. */
function monthYear(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default function ExperiencesManager({
  token,
  onTokenRefreshed,
  onLoggedOut,
  waking,
  onCountChange,
}: ExperiencesManagerProps) {
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [banner, setBanner] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK);
  const [ongoing, setOngoing] = useState(false);
  const [pickedSkillIds, setPickedSkillIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Experience | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>("list");

  function commit(next: Experience[]): Experience[] {
    const sorted = [...next].sort(byStartDateDesc);
    setExperiences(sorted);
    onCountChange?.(sorted.length);
    return sorted;
  }

  function load() {
    setLoadStatus("loading");
    Promise.all([getExperiencesFresh(), getSkillsFresh()])
      .then(([exps, sks]) => {
        const sorted = commit(exps);
        setSkills(sks);
        setLoadStatus("loaded");
        // Default the editor to the first record rather than a blank "new"
        // form, so opening the tab shows something rather than nothing —
        // but leave the mobile pane on the list, not jump into the editor.
        if (sorted.length > 0) loadIntoEditor(sorted[0]);
      })
      .catch(() => setLoadStatus("error"));
  }

  useEffect(() => {
    load();
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

  function handleAuthError(err: unknown): boolean {
    if (err instanceof UnauthorizedError) {
      onLoggedOut();
      return true;
    }
    return false;
  }

  /** Loads a role into the editor without switching the mobile pane —
   *  used both by explicit row selection and by the initial-load default. */
  function loadIntoEditor(exp: Experience) {
    setSelectedId(exp.id);
    setForm({
      jobTitle: exp.jobTitle,
      employer: exp.employer,
      startDate: toDateInput(exp.startDate),
      endDate: toDateInput(exp.endDate),
      description: exp.description,
    });
    setOngoing(exp.endDate === null);
    setPickedSkillIds(exp.skills.map((s) => s.id));
    setBanner(null);
  }

  function selectRole(exp: Experience) {
    loadIntoEditor(exp);
    setMobileView("editor");
  }

  function newRole() {
    setSelectedId(null);
    setForm(BLANK);
    setOngoing(false);
    setPickedSkillIds([]);
    setBanner(null);
    setMobileView("editor");
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
      endDate: ongoing ? null : form.endDate || null,
      description: form.description
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .join("\n"),
      skillIds: pickedSkillIds,
    };
    try {
      if (selectedId) {
        const updated = await runAuthed(token, onTokenRefreshed, (t) =>
          updateExperience(t, selectedId, payload)
        );
        commit(experiences.map((x) => (x.id === updated.id ? updated : x)));
      } else {
        const created = await runAuthed(token, onTokenRefreshed, (t) =>
          createExperience(t, payload)
        );
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
      await runAuthed(token, onTokenRefreshed, (t) =>
        deleteExperience(t, deleteTarget.id)
      );
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

  return (
    <div className="admin-manager-root" data-mobile-view={mobileView}>
      <AdminHeader
        title="Experience"
        endpoint="/api/Experience"
        waking={waking}
        onLoggedOut={onLoggedOut}
        primaryAction={
          <button
            type="button"
            className="admin-btn-primary"
            onClick={newRole}
          >
            + Add role
          </button>
        }
      />
      <div className="admin-body admin-body-split">
        {loadStatus === "error" && (
          <div className="admin-fetch-error">
            <span>This isn&rsquo;t available right now.</span>
            <button type="button" className="admin-btn-secondary" onClick={load}>
              Retry
            </button>
          </div>
        )}

        {loadStatus === "loaded" && (
          <div className="admin-split" data-mobile-view={mobileView}>
            <div className="admin-split-list">
              <div className="admin-list-head" data-cols="experience">
                <span>jobTitle</span>
                <span>employer</span>
                <span>period</span>
                <span>skills</span>
              </div>
              <div className="admin-list-rows">
                {experiences.length === 0 ? (
                  <div className="admin-list-empty">
                    <span>No records yet.</span>
                  </div>
                ) : (
                  experiences.map((exp) => (
                    <button
                      key={exp.id}
                      type="button"
                      className="admin-list-row"
                      data-cols="experience"
                      data-selected={selectedId === exp.id}
                      onClick={() => selectRole(exp)}
                    >
                      <span className="l-title">{exp.jobTitle}</span>
                      <span className="l-secondary">{exp.employer}</span>
                      <span className="l-period">
                        {monthYear(exp.startDate)} —{" "}
                        {exp.endDate ? monthYear(exp.endDate) : "Present"}
                      </span>
                      <span className="l-badge">
                        {exp.skills.length} LINKED
                      </span>
                    </button>
                  ))
                )}
              </div>
              <div className="admin-list-add">
                <button
                  type="button"
                  className="admin-btn-soft"
                  onClick={newRole}
                >
                  + Add role
                </button>
              </div>
            </div>

            <div className="admin-split-editor">
              <div className="admin-editor">
                <div className="admin-editor-head">
                  <button
                    type="button"
                    className="admin-editor-back"
                    aria-label="Back to list"
                    onClick={() => setMobileView("list")}
                  >
                    ←
                  </button>
                  <div className="admin-editor-head-titles">
                    <span className="admin-editor-eyebrow admin-mono">
                      {isEditing ? "EDITING" : "NEW"}
                    </span>
                    <span className="admin-editor-title">
                      {isEditing ? form.jobTitle || "Role" : "Add a role"}
                    </span>
                  </div>
                </div>

                <form
                  id="admin-exp-form"
                  className="admin-editor-body"
                  onSubmit={handleSubmit}
                >
                  {banner && <div className="admin-error-banner">{banner}</div>}

                  <div>
                    <label className="admin-label" htmlFor="exp-title">
                      Job title
                    </label>
                    <input
                      id="exp-title"
                      type="text"
                      className="admin-input"
                      value={form.jobTitle}
                      onChange={(e) => set("jobTitle", e.target.value)}
                      placeholder="Software Developer"
                    />
                  </div>
                  <div>
                    <label className="admin-label" htmlFor="exp-employer">
                      Employer
                    </label>
                    <input
                      id="exp-employer"
                      type="text"
                      className="admin-input"
                      value={form.employer}
                      onChange={(e) => set("employer", e.target.value)}
                      placeholder="Xiquel"
                    />
                  </div>

                  <div className="admin-editor-dates">
                    <div>
                      <label className="admin-label" htmlFor="exp-start">
                        startDate
                      </label>
                      <input
                        id="exp-start"
                        type="date"
                        className="admin-input admin-mono"
                        value={form.startDate}
                        onChange={(e) => set("startDate", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="admin-label" htmlFor="exp-end">
                        endDate
                      </label>
                      <input
                        id="exp-end"
                        type="date"
                        className="admin-input admin-mono"
                        value={form.endDate}
                        min={form.startDate || undefined}
                        disabled={ongoing}
                        onChange={(e) => set("endDate", e.target.value)}
                      />
                    </div>
                  </div>

                  <label className="admin-editor-checkbox">
                    <input
                      type="checkbox"
                      checked={ongoing}
                      onChange={(e) => setOngoing(e.target.checked)}
                    />
                    Ongoing — sends endDate: null
                  </label>

                  <div>
                    <label className="admin-label" htmlFor="exp-description">
                      description — one bullet per line
                    </label>
                    <textarea
                      id="exp-description"
                      className="admin-textarea"
                      style={{ minHeight: 168 }}
                      value={form.description}
                      onChange={(e) => set("description", e.target.value)}
                      placeholder={"Led backend development for…\nBuilt an automated…"}
                    />
                  </div>

                  <SkillPicker
                    groups={skillGroups}
                    pickedSkillIds={pickedSkillIds}
                    onChange={setPickedSkillIds}
                  />
                </form>

                <div className="admin-editor-footer">
                  {isEditing && (
                    <button
                      type="button"
                      className="admin-btn-text-danger"
                      onClick={() => {
                        const target = experiences.find(
                          (x) => x.id === selectedId
                        );
                        if (target) setDeleteTarget(target);
                      }}
                    >
                      Delete
                    </button>
                  )}
                  <div className="admin-editor-footer-spacer" />
                  <button
                    type="button"
                    className="admin-btn-secondary"
                    onClick={newRole}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="admin-exp-form"
                    className="admin-btn-primary"
                    disabled={!canSubmit}
                  >
                    {saving && (
                      <span className="admin-spinner" aria-hidden="true" />
                    )}
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {deleteTarget && (
        <DeleteConfirmModal
          deleting={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
