"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createProject,
  deleteProject,
  getProjectsFresh,
  UnauthorizedError,
  updateProject,
  type Project,
} from "@/lib/projectApi";
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

interface ProjectsManagerProps {
  token: string;
  onTokenRefreshed: (token: string) => void;
  onLoggedOut: () => void;
  waking: boolean;
  onCountChange: (count: number) => void;
}

type LoadStatus = "loading" | "ready" | "error";

const BLANK_FORM = { name: "", url: "", skillIds: [] as string[] };

export default function ProjectsManager({
  token,
  onTokenRefreshed,
  onLoggedOut,
  waking,
  onCountChange,
}: ProjectsManagerProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState(BLANK_FORM);
  const [adding, setAdding] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  function load() {
    setLoadStatus("loading");
    Promise.all([getProjectsFresh(), getSkillsFresh()])
      .then(([proj, sks]) => {
        const sorted = [...proj].sort((a, b) => a.name.localeCompare(b.name));
        setProjects(sorted);
        setSkills(sks);
        onCountChange(sorted.length);
        setLoadStatus("ready");
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

  function startEdit(project: Project) {
    setIsAdding(false);
    setEditingId(project.id);
    setEditForm({
      name: project.name,
      url: project.url,
      skillIds: project.skills.map((s) => s.id),
    });
  }

  function startAdd() {
    setEditingId(null);
    setAddForm(BLANK_FORM);
    setIsAdding(true);
  }

  async function saveEdit(id: string) {
    setSaving(true);
    try {
      const updated = await runAuthed(token, onTokenRefreshed, (t) =>
        updateProject(t, id, editForm)
      );
      setProjects((prev) =>
        [...prev.map((p) => (p.id === id ? updated : p))].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );
      setEditingId(null);
    } catch (err) {
      if (err instanceof UnauthorizedError) onLoggedOut();
    } finally {
      setSaving(false);
    }
  }

  async function handleAdd() {
    if (!addForm.name.trim() || !addForm.url.trim()) return;
    setAdding(true);
    try {
      const created = await runAuthed(token, onTokenRefreshed, (t) =>
        createProject(t, {
          name: addForm.name.trim(),
          url: addForm.url.trim(),
          skillIds: addForm.skillIds,
        })
      );
      const next = [...projects, created].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      setProjects(next);
      onCountChange(next.length);
      setAddForm(BLANK_FORM);
      setIsAdding(false);
    } catch (err) {
      if (err instanceof UnauthorizedError) onLoggedOut();
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await runAuthed(token, onTokenRefreshed, (t) =>
        deleteProject(t, deleteTarget.id)
      );
      const next = projects.filter((p) => p.id !== deleteTarget.id);
      setProjects(next);
      onCountChange(next.length);
      setDeleteTarget(null);
    } catch (err) {
      if (err instanceof UnauthorizedError) onLoggedOut();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <AdminHeader
        title="Projects"
        endpoint="/api/Project"
        waking={waking}
        onLoggedOut={onLoggedOut}
        primaryAction={
          <button type="button" className="admin-btn-primary" onClick={startAdd}>
            + Add project
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

        {loadStatus === "ready" && (
          <div className="admin-card">
            <div className="admin-card-body" style={{ padding: 0 }}>
              <div
                className="admin-table-head"
                data-cols="projects"
                style={{ padding: "10px 20px" }}
              >
                <span>name</span>
                <span>url</span>
                <span>skills</span>
                <span>row actions</span>
              </div>

              {isAdding && (
                <div
                  className="admin-row"
                  data-cols="projects"
                  data-editing="true"
                  style={{ padding: "12px 20px" }}
                >
                  <input
                    className="admin-input"
                    placeholder="Project name"
                    aria-label="New project name"
                    value={addForm.name}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, name: e.target.value }))
                    }
                    autoFocus
                  />
                  <input
                    className="admin-input admin-mono"
                    placeholder="https://…"
                    aria-label="New project url"
                    value={addForm.url}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, url: e.target.value }))
                    }
                  />
                  <span />
                  <span className="r-actions">
                    <button
                      type="button"
                      className="admin-btn-mini"
                      data-solid="true"
                      disabled={
                        adding || !addForm.name.trim() || !addForm.url.trim()
                      }
                      onClick={handleAdd}
                    >
                      {adding ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      className="admin-btn-mini"
                      onClick={() => setIsAdding(false)}
                      disabled={adding}
                    >
                      Cancel
                    </button>
                  </span>
                  <div className="admin-row-expand">
                    <SkillPicker
                      groups={skillGroups}
                      pickedSkillIds={addForm.skillIds}
                      onChange={(ids) =>
                        setAddForm((f) => ({ ...f, skillIds: ids }))
                      }
                    />
                  </div>
                </div>
              )}

              {projects.length === 0 && !isAdding && (
                <div className="admin-empty-row" style={{ padding: "16px 20px" }}>
                  <span>No records yet.</span>
                </div>
              )}

              {projects.map((project) => (
                <div
                  key={project.id}
                  className="admin-row"
                  data-cols="projects"
                  data-editing={editingId === project.id}
                  style={{ padding: "12px 20px" }}
                >
                  {editingId === project.id ? (
                    <>
                      <input
                        className="admin-input"
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, name: e.target.value }))
                        }
                        autoFocus
                      />
                      <input
                        className="admin-input admin-mono"
                        value={editForm.url}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, url: e.target.value }))
                        }
                      />
                      <span />
                      <span className="r-actions">
                        <button
                          type="button"
                          className="admin-btn-mini"
                          data-solid="true"
                          disabled={saving}
                          onClick={() => saveEdit(project.id)}
                        >
                          {saving ? "Saving…" : "Save"}
                        </button>
                        <button
                          type="button"
                          className="admin-btn-mini"
                          onClick={() => setEditingId(null)}
                          disabled={saving}
                        >
                          Cancel
                        </button>
                      </span>
                      <div className="admin-row-expand">
                        <SkillPicker
                          groups={skillGroups}
                          pickedSkillIds={editForm.skillIds}
                          onChange={(ids) =>
                            setEditForm((f) => ({ ...f, skillIds: ids }))
                          }
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="r-name">{project.name}</span>
                      <span className="r-meta admin-mono">{project.url}</span>
                      <span className="r-tags admin-tag-row">
                        {project.skills.map((s) => (
                          <span key={s.id} className="admin-tag">
                            {s.name}
                          </span>
                        ))}
                      </span>
                      <span className="r-actions">
                        <button
                          type="button"
                          className="admin-btn-mini"
                          data-tone="accent"
                          onClick={() => startEdit(project)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="admin-btn-mini"
                          data-tone="danger"
                          onClick={() => setDeleteTarget(project)}
                        >
                          Delete
                        </button>
                      </span>
                      <div className="admin-row-stack">
                        <span className="r-meta admin-mono">{project.url}</span>
                        <span className="r-tags admin-tag-row">
                          {project.skills.map((s) => (
                            <span key={s.id} className="admin-tag">
                              {s.name}
                            </span>
                          ))}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {loadStatus === "ready" && (
          <div className="admin-list-add">
            <button type="button" className="admin-btn-soft" onClick={startAdd}>
              + Add project
            </button>
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
