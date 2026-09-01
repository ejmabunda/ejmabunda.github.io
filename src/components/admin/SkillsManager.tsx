"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createSkill,
  deleteSkill,
  getSkillsFresh,
  updateSkill,
  UnauthorizedError,
  CATEGORY_LABEL,
  SKILL_CATEGORY,
  SKILL_CATEGORY_NAMES,
  type Skill,
  type SkillCategoryName,
} from "@/lib/skillApi";
import { refreshAccessToken } from "@/lib/authApi";
import DeleteConfirmModal from "./DeleteConfirmModal";

interface SkillsManagerProps {
  token: string;
  onTokenRefreshed: (token: string) => void;
  onLoggedOut: () => void;
}

type LoadStatus = "loading" | "loaded" | "error";

const DEFAULT_CATEGORY: SkillCategoryName = "LanguagesAndBackend";

function sortSkills(list: Skill[]): Skill[] {
  return [...list].sort((a, b) => {
    const byCategory =
      SKILL_CATEGORY_NAMES.indexOf(a.skillCategory) -
      SKILL_CATEGORY_NAMES.indexOf(b.skillCategory);
    return byCategory !== 0 ? byCategory : a.name.localeCompare(b.name);
  });
}

export default function SkillsManager({
  token,
  onTokenRefreshed,
  onLoggedOut,
}: SkillsManagerProps) {
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [skills, setSkills] = useState<Skill[]>([]);
  const [banner, setBanner] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] =
    useState<SkillCategoryName>(DEFAULT_CATEGORY);
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] =
    useState<SkillCategoryName>(DEFAULT_CATEGORY);
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Skill | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSkillsFresh()
      .then((data) => {
        if (cancelled) return;
        setSkills(sortSkills(data));
        setLoadStatus("loaded");
      })
      .catch(() => {
        if (cancelled) return;
        setLoadStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sorted = useMemo(() => sortSkills(skills), [skills]);

  // Runs an authed call with the current token; on a 401 mint a fresh token
  // from the refresh cookie and retry once. Matches ProfileEditor.runAuthed —
  // the signing key is regenerated on every backend restart, so a post-deploy
  // 401 → refresh → retry is the normal path, not an edge case.
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

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name || adding) return;
    setAdding(true);
    setBanner(null);
    try {
      const created = await runAuthed((t) =>
        createSkill(t, { name, skillCategory: SKILL_CATEGORY[newCategory] })
      );
      setSkills((prev) => sortSkills([...prev, created]));
      setNewName("");
      setNewCategory(DEFAULT_CATEGORY);
    } catch (err) {
      if (handleAuthError(err)) return;
      setBanner("Couldn't add that skill. Try again.");
    } finally {
      setAdding(false);
    }
  };

  const beginEdit = (skill: Skill) => {
    setEditingId(skill.id);
    setEditName(skill.name);
    setEditCategory(skill.skillCategory);
    setBanner(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    const name = editName.trim();
    if (!name || !editingId || savingEdit) return;
    setSavingEdit(true);
    setBanner(null);
    try {
      const updated = await runAuthed((t) =>
        updateSkill(t, {
          id: editingId,
          name,
          skillCategory: SKILL_CATEGORY[editCategory],
        })
      );
      setSkills((prev) =>
        sortSkills(prev.map((s) => (s.id === updated.id ? updated : s)))
      );
      setEditingId(null);
    } catch (err) {
      if (handleAuthError(err)) return;
      setBanner("Couldn't save that change. Try again.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setBanner(null);
    try {
      await runAuthed((t) => deleteSkill(t, deleteTarget.id));
      setSkills((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      if (handleAuthError(err)) return;
      setBanner("Couldn't delete that skill. Try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="admin-card">
      <h1 className="admin-h1">Skills</h1>
      <p className="admin-subtext">
        The skill list shown on your site, grouped by category. Changes go live
        immediately.
      </p>

      {banner && <div className="admin-error-banner">{banner}</div>}

      {loadStatus === "loading" && (
        <p className="admin-subtext">Loading…</p>
      )}

      {loadStatus === "error" && (
        <p className="admin-subtext">
          Something went wrong fetching your skills. Refresh to try again.
        </p>
      )}

      {loadStatus === "loaded" && (
        <>
          <form className="admin-skill-add" onSubmit={handleAdd}>
            <input
              type="text"
              aria-label="New skill name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. GitHub"
              className="admin-input-plain"
            />
            <select
              aria-label="New skill category"
              value={newCategory}
              onChange={(e) =>
                setNewCategory(e.target.value as SkillCategoryName)
              }
              className="admin-select"
            >
              {SKILL_CATEGORY_NAMES.map((name) => (
                <option key={name} value={name}>
                  {CATEGORY_LABEL[name]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="admin-btn-primary admin-skill-add-btn"
              disabled={adding || newName.trim() === ""}
            >
              {adding && <span className="admin-spinner" aria-hidden="true" />}
              {adding ? "Adding…" : "Add skill"}
            </button>
          </form>

          {sorted.length === 0 ? (
            <p className="admin-subtext">
              No skills yet. Add one above to publish the list.
            </p>
          ) : (
            <ul className="admin-skill-list">
              {sorted.map((skill) =>
                editingId === skill.id ? (
                  <li key={skill.id} className="admin-skill-row is-editing">
                    <form
                      className="admin-skill-edit"
                      onSubmit={handleSaveEdit}
                    >
                      <input
                        type="text"
                        aria-label={`Rename ${skill.name}`}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="admin-input-plain"
                      />
                      <select
                        aria-label={`Category for ${skill.name}`}
                        value={editCategory}
                        onChange={(e) =>
                          setEditCategory(e.target.value as SkillCategoryName)
                        }
                        className="admin-select"
                      >
                        {SKILL_CATEGORY_NAMES.map((name) => (
                          <option key={name} value={name}>
                            {CATEGORY_LABEL[name]}
                          </option>
                        ))}
                      </select>
                      <div className="admin-skill-actions">
                        <button
                          type="submit"
                          className="admin-btn-secondary"
                          disabled={savingEdit || editName.trim() === ""}
                        >
                          {savingEdit ? "Saving…" : "Save"}
                        </button>
                        <button
                          type="button"
                          className="admin-btn-secondary"
                          onClick={cancelEdit}
                          disabled={savingEdit}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </li>
                ) : (
                  <li key={skill.id} className="admin-skill-row">
                    <span className="admin-skill-name">{skill.name}</span>
                    <span className="admin-skill-cat">
                      {CATEGORY_LABEL[skill.skillCategory]}
                    </span>
                    <div className="admin-skill-actions">
                      <button
                        type="button"
                        className="admin-btn-secondary"
                        onClick={() => beginEdit(skill)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="admin-btn-secondary"
                        onClick={() => setDeleteTarget(skill)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                )
              )}
            </ul>
          )}
        </>
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          deleting={deleting}
          title={`Delete "${deleteTarget.name}"?`}
          body="This removes the skill from your site. This can't be undone."
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
