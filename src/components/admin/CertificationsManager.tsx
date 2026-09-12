"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createCertification,
  deleteCertification,
  getCertificationsFresh,
  UnauthorizedError,
  updateCertification,
  type Certification,
} from "@/lib/certificationApi";
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

interface CertificationsManagerProps {
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
  issuingOrganization: "",
  issueDate: "",
  url: "",
};

function byIssueDateDesc(a: Certification, b: Certification): number {
  return b.issueDate.localeCompare(a.issueDate);
}

function toDateInput(iso: string): string {
  return iso ? iso.slice(0, 10) : "";
}

function monthYear(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default function CertificationsManager({
  token,
  onTokenRefreshed,
  onLoggedOut,
  waking,
  onCountChange,
}: CertificationsManagerProps) {
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [banner, setBanner] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK);
  const [pickedSkillIds, setPickedSkillIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Certification | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>("list");

  function commit(next: Certification[]): Certification[] {
    const sorted = [...next].sort(byIssueDateDesc);
    setCertifications(sorted);
    onCountChange?.(sorted.length);
    return sorted;
  }

  function load() {
    setLoadStatus("loading");
    Promise.all([getCertificationsFresh(), getSkillsFresh()])
      .then(([certs, sks]) => {
        const sorted = commit(certs);
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

  function loadIntoEditor(c: Certification) {
    setSelectedId(c.id);
    setForm({
      name: c.name,
      issuingOrganization: c.issuingOrganization,
      issueDate: toDateInput(c.issueDate),
      url: c.url,
    });
    setPickedSkillIds(c.skills.map((s) => s.id));
    setBanner(null);
  }

  function selectCertification(c: Certification) {
    loadIntoEditor(c);
    setMobileView("editor");
  }

  function newCertification() {
    setSelectedId(null);
    setForm(BLANK);
    setPickedSkillIds([]);
    setBanner(null);
    setMobileView("editor");
  }

  const isEditing = selectedId !== null;
  const canSubmit =
    form.name.trim() !== "" &&
    form.issuingOrganization.trim() !== "" &&
    form.issueDate !== "" &&
    !saving;

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setBanner(null);
    const payload = {
      name: form.name.trim(),
      issuingOrganization: form.issuingOrganization.trim(),
      issueDate: form.issueDate,
      url: form.url.trim(),
      skillIds: pickedSkillIds,
    };
    try {
      if (selectedId) {
        const updated = await runAuthed(token, onTokenRefreshed, (t) =>
          updateCertification(t, selectedId, payload)
        );
        commit(
          certifications.map((x) => (x.id === updated.id ? updated : x))
        );
      } else {
        const created = await runAuthed(token, onTokenRefreshed, (t) =>
          createCertification(t, payload)
        );
        commit([created, ...certifications]);
        newCertification();
      }
      setMobileView("list");
    } catch (err) {
      if (handleAuthError(err)) return;
      setBanner(
        selectedId
          ? "Couldn't save that certification. Try again."
          : "Couldn't add that certification. Try again."
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
        deleteCertification(t, deleteTarget.id)
      );
      commit(certifications.filter((x) => x.id !== deleteTarget.id));
      if (selectedId === deleteTarget.id) newCertification();
      setDeleteTarget(null);
      setMobileView("list");
    } catch (err) {
      if (handleAuthError(err)) return;
      setBanner("Couldn't delete that certification. Try again.");
    } finally {
      setDeleting(false);
    }
  };

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <>
      <AdminHeader
        title="Certifications"
        endpoint="/api/Certification"
        waking={waking}
        onLoggedOut={onLoggedOut}
        primaryAction={
          <button
            type="button"
            className="admin-btn-primary"
            onClick={newCertification}
          >
            + Add certification
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
              <div className="admin-list-rows">
                {certifications.length === 0 ? (
                  <div className="admin-list-empty">
                    <span>No records yet.</span>
                  </div>
                ) : (
                  certifications.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="admin-list-row"
                      data-cols="certifications"
                      data-selected={selectedId === c.id}
                      onClick={() => selectCertification(c)}
                    >
                      <span className="l-title">{c.name}</span>
                      <span className="l-secondary">
                        {c.issuingOrganization}
                      </span>
                      <span className="l-period">{monthYear(c.issueDate)}</span>
                      <span className="l-badge">
                        {c.skills.length} LINKED
                      </span>
                    </button>
                  ))
                )}
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
                      {isEditing ? form.name || "Certification" : "Add a certification"}
                    </span>
                  </div>
                </div>

                <form
                  id="admin-cert-form"
                  className="admin-editor-body"
                  onSubmit={handleSubmit}
                >
                  {banner && <div className="admin-error-banner">{banner}</div>}

                  <div>
                    <label className="admin-label" htmlFor="cert-name">
                      name
                    </label>
                    <input
                      id="cert-name"
                      type="text"
                      className="admin-input"
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder="AZ-204"
                    />
                  </div>
                  <div>
                    <label className="admin-label" htmlFor="cert-org">
                      issuingOrganization
                    </label>
                    <input
                      id="cert-org"
                      type="text"
                      className="admin-input"
                      value={form.issuingOrganization}
                      onChange={(e) =>
                        set("issuingOrganization", e.target.value)
                      }
                      placeholder="Microsoft"
                    />
                  </div>

                  <div className="admin-editor-dates">
                    <div>
                      <label className="admin-label" htmlFor="cert-date">
                        issueDate
                      </label>
                      <input
                        id="cert-date"
                        type="date"
                        className="admin-input admin-mono"
                        value={form.issueDate}
                        onChange={(e) => set("issueDate", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="admin-label" htmlFor="cert-url">
                        url
                      </label>
                      <input
                        id="cert-url"
                        type="text"
                        className="admin-input admin-mono"
                        value={form.url}
                        onChange={(e) => set("url", e.target.value)}
                        placeholder="https://…"
                      />
                    </div>
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
                        const target = certifications.find(
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
                    onClick={newCertification}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="admin-cert-form"
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
          title={`Delete "${deleteTarget.name}"?`}
          body="The record and its skill links are removed. This runs immediately against the live API and can't be undone."
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}
