"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createQualification,
  deleteQualification,
  getQualificationsFresh,
  NQF_LEVEL,
  NQF_LEVEL_LABEL,
  NQF_LEVEL_NAMES,
  UnauthorizedError,
  updateQualification,
  type NqfLevelName,
  type Qualification,
} from "@/lib/qualificationApi";
import {
  CATEGORY_LABEL,
  getSkillsFresh,
  SKILL_CATEGORY_NAMES,
  type Skill,
} from "@/lib/skillApi";
import { runAuthed } from "@/lib/runAuthed";
import AdminHeader from "./AdminHeader";
import DeleteConfirmModal from "./DeleteConfirmModal";
import SkillPicker from "./SkillPicker";

interface QualificationsManagerProps {
  token: string;
  onTokenRefreshed: (token: string) => void;
  onLoggedOut: () => void;
  waking: boolean;
  onCountChange?: (count: number) => void;
}

type LoadStatus = "loading" | "loaded" | "error";
type MobileView = "list" | "editor";

const BLANK = {
  name: "",
  institution: "",
  startDate: "",
  endDate: "",
  nqfLevel: "Nqf7" as NqfLevelName,
};

function byNqfLevelDesc(a: Qualification, b: Qualification): number {
  return NQF_LEVEL[b.nqfLevel] - NQF_LEVEL[a.nqfLevel];
}

function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

function monthYear(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default function QualificationsManager({
  token,
  onTokenRefreshed,
  onLoggedOut,
  waking,
  onCountChange,
}: QualificationsManagerProps) {
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [banner, setBanner] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK);
  const [inProgress, setInProgress] = useState(false);
  const [pickedSkillIds, setPickedSkillIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Qualification | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>("list");

  function commit(next: Qualification[]): Qualification[] {
    const sorted = [...next].sort(byNqfLevelDesc);
    setQualifications(sorted);
    onCountChange?.(sorted.length);
    return sorted;
  }

  function load() {
    setLoadStatus("loading");
    Promise.all([getQualificationsFresh(), getSkillsFresh()])
      .then(([quals, sks]) => {
        const sorted = commit(quals);
        setSkills(sks);
        setLoadStatus("loaded");
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

  function loadIntoEditor(q: Qualification) {
    setSelectedId(q.id);
    setForm({
      name: q.name,
      institution: q.institution,
      startDate: toDateInput(q.startDate),
      endDate: toDateInput(q.endDate),
      nqfLevel: q.nqfLevel,
    });
    setInProgress(q.endDate === null);
    setPickedSkillIds(q.skills.map((s) => s.id));
    setBanner(null);
  }

  function selectQualification(q: Qualification) {
    loadIntoEditor(q);
    setMobileView("editor");
  }

  function newQualification() {
    setSelectedId(null);
    setForm(BLANK);
    setInProgress(false);
    setPickedSkillIds([]);
    setBanner(null);
    setMobileView("editor");
  }

  const isEditing = selectedId !== null;
  const canSubmit =
    form.name.trim() !== "" &&
    form.institution.trim() !== "" &&
    form.startDate !== "" &&
    !saving;

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setBanner(null);
    const payload = {
      name: form.name.trim(),
      institution: form.institution.trim(),
      startDate: form.startDate,
      endDate: inProgress ? null : form.endDate || null,
      nqfLevel: NQF_LEVEL[form.nqfLevel],
      skillIds: pickedSkillIds,
    };
    try {
      if (selectedId) {
        const updated = await runAuthed(token, onTokenRefreshed, (t) =>
          updateQualification(t, selectedId, payload)
        );
        commit(
          qualifications.map((x) => (x.id === updated.id ? updated : x))
        );
      } else {
        const created = await runAuthed(token, onTokenRefreshed, (t) =>
          createQualification(t, payload)
        );
        commit([created, ...qualifications]);
        newQualification();
      }
      setMobileView("list");
    } catch (err) {
      if (handleAuthError(err)) return;
      setBanner(
        selectedId
          ? "Couldn't save that qualification. Try again."
          : "Couldn't add that qualification. Try again."
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
        deleteQualification(t, deleteTarget.id)
      );
      commit(qualifications.filter((x) => x.id !== deleteTarget.id));
      if (selectedId === deleteTarget.id) newQualification();
      setDeleteTarget(null);
      setMobileView("list");
    } catch (err) {
      if (handleAuthError(err)) return;
      setBanner("Couldn't delete that qualification. Try again.");
    } finally {
      setDeleting(false);
    }
  };

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <>
      <AdminHeader
        title="Qualifications"
        endpoint="/api/Qualification"
        waking={waking}
        onLoggedOut={onLoggedOut}
        primaryAction={
          <button
            type="button"
            className="admin-btn-primary"
            onClick={newQualification}
          >
            + Add qualification
          </button>
        }
      />
      <div className="admin-body">
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
              <div className="admin-list-head" data-cols="qualifications">
                <span>name</span>
                <span>institution</span>
                <span>period</span>
                <span>nqfLevel</span>
              </div>
              <div className="admin-list-rows">
                {qualifications.length === 0 ? (
                  <div className="admin-list-empty">
                    <span>No records yet.</span>
                  </div>
                ) : (
                  qualifications.map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      className="admin-list-row"
                      data-cols="qualifications"
                      data-selected={selectedId === q.id}
                      onClick={() => selectQualification(q)}
                    >
                      <span className="l-title">{q.name}</span>
                      <span className="l-secondary">{q.institution}</span>
                      <span className="l-period">
                        {monthYear(q.startDate)} —{" "}
                        {q.endDate ? monthYear(q.endDate) : "In progress"}
                      </span>
                      <span className="l-badge">
                        NQF {NQF_LEVEL[q.nqfLevel]}
                      </span>
                    </button>
                  ))
                )}
              </div>
              <div className="admin-list-add">
                <button
                  type="button"
                  className="admin-btn-soft"
                  onClick={newQualification}
                >
                  + Add qualification
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
                      {isEditing ? form.name || "Qualification" : "Add a qualification"}
                    </span>
                  </div>
                </div>

                <form
                  id="admin-qual-form"
                  className="admin-editor-body"
                  onSubmit={handleSubmit}
                >
                  {banner && <div className="admin-error-banner">{banner}</div>}

                  <div>
                    <label className="admin-label" htmlFor="qual-name">
                      name
                    </label>
                    <input
                      id="qual-name"
                      type="text"
                      className="admin-input"
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder="BSc Computer Science"
                    />
                  </div>
                  <div>
                    <label className="admin-label" htmlFor="qual-institution">
                      institution
                    </label>
                    <input
                      id="qual-institution"
                      type="text"
                      className="admin-input"
                      value={form.institution}
                      onChange={(e) => set("institution", e.target.value)}
                      placeholder="University of Johannesburg"
                    />
                  </div>

                  <div className="admin-editor-dates">
                    <div>
                      <label className="admin-label" htmlFor="qual-start">
                        startDate
                      </label>
                      <input
                        id="qual-start"
                        type="date"
                        className="admin-input admin-mono"
                        value={form.startDate}
                        onChange={(e) => set("startDate", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="admin-label" htmlFor="qual-end">
                        endDate
                      </label>
                      <input
                        id="qual-end"
                        type="date"
                        className="admin-input admin-mono"
                        value={form.endDate}
                        min={form.startDate || undefined}
                        disabled={inProgress}
                        onChange={(e) => set("endDate", e.target.value)}
                      />
                    </div>
                  </div>

                  <label className="admin-editor-checkbox">
                    <input
                      type="checkbox"
                      checked={inProgress}
                      onChange={(e) => setInProgress(e.target.checked)}
                    />
                    In progress — sends endDate: null
                  </label>

                  <div>
                    <label className="admin-label" htmlFor="qual-nqf">
                      nqfLevel (int {NQF_LEVEL[form.nqfLevel]})
                    </label>
                    <select
                      id="qual-nqf"
                      className="admin-select"
                      value={form.nqfLevel}
                      onChange={(e) =>
                        set("nqfLevel", e.target.value as NqfLevelName)
                      }
                    >
                      {NQF_LEVEL_NAMES.map((name) => (
                        <option key={name} value={name}>
                          {NQF_LEVEL_LABEL[name]}
                        </option>
                      ))}
                    </select>
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
                        const target = qualifications.find(
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
                    onClick={newQualification}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="admin-qual-form"
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
    </>
  );
}
