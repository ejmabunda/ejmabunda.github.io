"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
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
  onCountChange?: (count: number) => void;
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
  onCountChange,
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

  function commit(next: Skill[]) {
    const sorted = sortSkills(next);
    setSkills(sorted);
    onCountChange?.(sorted.length);
  }

  useEffect(() => {
    let cancelled = false;
    getSkillsFresh()
      .then((data) => {
        if (cancelled) return;
        commit(data);
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

  const sorted = useMemo(() => sortSkills(skills), [skills]);
  const groups = useMemo(
    () =>
      SKILL_CATEGORY_NAMES.map((name) => ({
        name,
        label: CATEGORY_LABEL[name],
        items: sorted.filter((s) => s.skillCategory === name),
      })).filter((g) => g.items.length > 0),
    [sorted]
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
      commit([...skills, created]);
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
      commit(skills.map((s) => (s.id === updated.id ? updated : s)));
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
      commit(skills.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      if (handleAuthError(err)) return;
      setBanner("Couldn't delete that skill. Try again.");
    } finally {
      setDeleting(false);
    }
  };

  const categorySelect = (
    value: SkillCategoryName,
    onChange: (v: SkillCategoryName) => void,
    label: string
  ) => (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as SkillCategoryName)}
      className="admin-select"
    >
      {SKILL_CATEGORY_NAMES.map((name) => (
        <option key={name} value={name}>
          {CATEGORY_LABEL[name]}
        </option>
      ))}
    </select>
  );

  const renderRow = (skill: Skill) =>
    editingId === skill.id ? (
      <li
        key={skill.id}
        className="admin-skill-tr"
        data-editing="true"
      >
        <form className="admin-skill-edit-fields" onSubmit={handleSaveEdit}>
          <input
            type="text"
            aria-label={`Rename ${skill.name}`}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="admin-input-plain"
          />
          {categorySelect(
            editCategory,
            setEditCategory,
            `Category for ${skill.name}`
          )}
          <span className="s-actions">
            <button
              type="submit"
              className="admin-btn-mini"
              data-solid="true"
              disabled={savingEdit || editName.trim() === ""}
            >
              {savingEdit ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              className="admin-btn-mini"
              onClick={() => setEditingId(null)}
              disabled={savingEdit}
            >
              Cancel
            </button>
          </span>
        </form>
      </li>
    ) : (
      <li key={skill.id} className="admin-skill-tr">
        <span className="s-name">{skill.name}</span>
        <span className="s-cat">{CATEGORY_LABEL[skill.skillCategory]}</span>
        <span className="s-actions">
          <button
            type="button"
            className="admin-btn-mini"
            onClick={() => beginEdit(skill)}
          >
            Edit
          </button>
          <button
            type="button"
            className="admin-btn-mini"
            data-tone="danger"
            onClick={() => setDeleteTarget(skill)}
          >
            Delete
          </button>
        </span>
      </li>
    );

  return (
    <>
      <div className="admin-actionbar">
        <div className="admin-actionbar-title">
          Skills
          <span className="admin-pill">{sorted.length} live</span>
        </div>
        <span className="admin-actionbar-status">all changes saved</span>
        <div className="admin-actionbar-actions">
          <button
            type="button"
            className="admin-btn-action"
            data-idle="true"
            disabled
          >
            All changes saved
          </button>
        </div>
      </div>

      <div className="admin-body">
        {loadStatus === "loading" && <p className="admin-subtext">Loading…</p>}

        {loadStatus === "error" && (
          <p className="admin-subtext">
            Something went wrong fetching your skills. Refresh to try again.
          </p>
        )}

        {loadStatus === "loaded" && (
          <div className="admin-content-grid">
            <div className="admin-card admin-card-scrollable">
              <div className="admin-card-head">
                <div className="admin-card-lead">
                  <h3 className="admin-h2">Skill list</h3>
                  <p className="admin-subtext" style={{ margin: 0 }}>
                    The skill list shown on your site, grouped by category.
                    Changes go live immediately.
                  </p>
                </div>
                {banner && (
                  <div
                    className="admin-error-banner"
                    style={{ marginTop: 14, marginBottom: 0 }}
                  >
                    {banner}
                  </div>
                )}
                <form className="admin-skill-add-row" onSubmit={handleAdd}>
                  <input
                    type="text"
                    aria-label="New skill name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. GitHub"
                    className="admin-input-plain"
                    style={{ marginBottom: 0 }}
                  />
                  {categorySelect(
                    newCategory,
                    setNewCategory,
                    "New skill category"
                  )}
                  <button
                    type="submit"
                    className="admin-btn-mini"
                    data-tone="accent"
                    disabled={adding || newName.trim() === ""}
                    style={{ padding: "11px 16px", fontSize: 13 }}
                  >
                    {adding ? "Adding…" : "+ Add skill"}
                  </button>
                </form>
              </div>

              <div className="admin-table-head">
                <span>SKILL</span>
                <span className="col-cat">CATEGORY</span>
                <span />
              </div>

              <div className="admin-skill-scroll">
                {sorted.length === 0 ? (
                  <p className="admin-subtext" style={{ padding: "16px 20px" }}>
                    No skills yet. Add one above to publish the list.
                  </p>
                ) : (
                  groups.map((group) => (
                    <div key={group.name} className="admin-skill-group">
                      <div className="admin-skill-group-head">
                        {group.label.toUpperCase()} · {group.items.length} OF{" "}
                        {sorted.length}
                      </div>
                      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                        {group.items.map(renderRow)}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            </div>

            <aside className="admin-context">
              <div className="admin-context-panel">
                <span className="admin-context-label">BY CATEGORY</span>
                {SKILL_CATEGORY_NAMES.map((name) => (
                  <div key={name} className="admin-context-row">
                    <span>{CATEGORY_LABEL[name]}</span>
                    <b data-accent="true">
                      {sorted.filter((s) => s.skillCategory === name).length}
                    </b>
                  </div>
                ))}
              </div>
              <div className="admin-context-panel">
                <span className="admin-context-label">PREVIEW</span>
                <div className="admin-chip-row">
                  {sorted.slice(0, 14).map((s) => (
                    <span key={s.id} className="admin-chip">
                      {s.name}
                    </span>
                  ))}
                  {sorted.length > 14 && (
                    <span className="admin-chip">+{sorted.length - 14}</span>
                  )}
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>

      {deleteTarget && (
        <DeleteConfirmModal
          deleting={deleting}
          title={`Delete "${deleteTarget.name}"?`}
          body="This removes the skill from your site. This can't be undone."
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}
