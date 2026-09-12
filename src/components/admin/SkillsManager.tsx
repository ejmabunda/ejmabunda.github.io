"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CATEGORY_LABEL,
  createSkill,
  deleteSkill,
  getSkillsFresh,
  SKILL_CATEGORY,
  SKILL_CATEGORY_NAMES,
  UnauthorizedError,
  updateSkill,
  type Skill,
  type SkillCategoryName,
} from "@/lib/skillApi";
import { getExperiencesFresh } from "@/lib/experienceApi";
import { getProjectsFresh } from "@/lib/projectApi";
import { getQualificationsFresh } from "@/lib/qualificationApi";
import { getCertificationsFresh } from "@/lib/certificationApi";
import { runAuthed } from "@/lib/runAuthed";
import AdminHeader from "./AdminHeader";
import DeleteConfirmModal from "./DeleteConfirmModal";

interface SkillsManagerProps {
  token: string;
  onTokenRefreshed: (token: string) => void;
  onLoggedOut: () => void;
  waking: boolean;
  onCountChange: (count: number) => void;
}

type LoadStatus = "loading" | "ready" | "error";

/**
 * Best-effort usage count per skill id, tallied across every record type
 * that links skills. Experience is the only one with a real backend today;
 * the rest resolve to `[]` until their controllers ship (see projectApi
 * etc.), so this naturally starts counting them too once they exist.
 */
async function computeLinkedCounts(): Promise<Record<string, number>> {
  const [experiences, projects, qualifications, certifications] =
    await Promise.all([
      getExperiencesFresh().catch(() => []),
      getProjectsFresh().catch(() => []),
      getQualificationsFresh().catch(() => []),
      getCertificationsFresh().catch(() => []),
    ]);
  const counts: Record<string, number> = {};
  for (const record of [
    ...experiences,
    ...projects,
    ...qualifications,
    ...certifications,
  ]) {
    for (const skill of record.skills) {
      counts[skill.id] = (counts[skill.id] ?? 0) + 1;
    }
  }
  return counts;
}

export default function SkillsManager({
  token,
  onTokenRefreshed,
  onLoggedOut,
  waking,
  onCountChange,
}: SkillsManagerProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [linkedCounts, setLinkedCounts] = useState<Record<string, number>>({});
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<
    SkillCategoryName | "all"
  >("all");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState<SkillCategoryName>(
    SKILL_CATEGORY_NAMES[0]
  );
  const [savingId, setSavingId] = useState<string | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<SkillCategoryName>(
    SKILL_CATEGORY_NAMES[0]
  );
  const [adding, setAdding] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Skill | null>(null);
  const [deleting, setDeleting] = useState(false);

  function load() {
    setLoadStatus("loading");
    getSkillsFresh()
      .then((data) => {
        setSkills(data);
        onCountChange(data.length);
        setLoadStatus("ready");
        computeLinkedCounts().then(setLinkedCounts);
      })
      .catch(() => setLoadStatus("error"));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return skills.filter((s) => {
      if (categoryFilter !== "all" && s.skillCategory !== categoryFilter) {
        return false;
      }
      return q === "" || s.name.toLowerCase().includes(q);
    });
  }, [skills, search, categoryFilter]);

  const groups = useMemo(() => {
    return SKILL_CATEGORY_NAMES.map((name) => ({
      name,
      items: filtered
        .filter((s) => s.skillCategory === name)
        .sort((a, b) => a.name.localeCompare(b.name)),
    })).filter((g) => g.items.length > 0);
  }, [filtered]);

  function startEdit(skill: Skill) {
    setIsAdding(false);
    setEditingId(skill.id);
    setEditName(skill.name);
    setEditCategory(skill.skillCategory);
  }

  function startAdd() {
    setEditingId(null);
    setNewName("");
    setNewCategory(SKILL_CATEGORY_NAMES[0]);
    setIsAdding(true);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(id: string) {
    setSavingId(id);
    try {
      const updated = await runAuthed(token, onTokenRefreshed, (t) =>
        updateSkill(t, {
          id,
          name: editName,
          skillCategory: SKILL_CATEGORY[editCategory],
        })
      );
      setSkills((prev) => prev.map((s) => (s.id === id ? updated : s)));
      setEditingId(null);
    } catch (err) {
      if (err instanceof UnauthorizedError) onLoggedOut();
    } finally {
      setSavingId(null);
    }
  }

  async function handleAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const created = await runAuthed(token, onTokenRefreshed, (t) =>
        createSkill(t, {
          name: newName.trim(),
          skillCategory: SKILL_CATEGORY[newCategory],
        })
      );
      const next = [...skills, created];
      setSkills(next);
      onCountChange(next.length);
      setNewName("");
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
        deleteSkill(t, deleteTarget.id)
      );
      const next = skills.filter((s) => s.id !== deleteTarget.id);
      setSkills(next);
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
        title="Skills"
        endpoint="/api/Skill"
        waking={waking}
        onLoggedOut={onLoggedOut}
        primaryAction={
          <button type="button" className="admin-btn-primary" onClick={startAdd}>
            + Add skill
          </button>
        }
      />
      <div className="admin-body">
        <div className="admin-toolbar">
          <div className="admin-search-wrap">
            <span className="admin-search-icon" aria-hidden="true" />
            <input
              className="admin-input admin-toolbar-search"
              placeholder="Search skills…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search skills"
            />
          </div>
          <select
            className="admin-select admin-category-select"
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as SkillCategoryName | "all")
            }
            aria-label="Filter by category"
          >
            <option value="all">Category: all</option>
            {SKILL_CATEGORY_NAMES.map((name) => (
              <option key={name} value={name}>
                Category: {CATEGORY_LABEL[name]}
              </option>
            ))}
          </select>
          <span className="admin-toolbar-count admin-mono">
            {filtered.length} record{filtered.length === 1 ? "" : "s"} ·
            grouped by category
          </span>
        </div>

        {loadStatus === "error" && (
          <div className="admin-fetch-error">
            <span>This isn&rsquo;t available right now.</span>
            <button
              type="button"
              className="admin-btn-secondary"
              onClick={load}
            >
              Retry
            </button>
          </div>
        )}

        {loadStatus === "ready" && (
          <>
            <div className="admin-table-head" data-cols="skills">
              <span>name</span>
              <span>skillCategory</span>
              <span>linked</span>
              <span>row actions</span>
            </div>

            {isAdding && (
              <div
                className="admin-row"
                data-cols="skills"
                data-editing="true"
              >
                  <input
                    className="admin-input"
                    aria-label="New skill name"
                    placeholder="Skill name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    autoFocus
                  />
                  <select
                    className="admin-select"
                    aria-label="New skill category"
                    value={newCategory}
                    onChange={(e) =>
                      setNewCategory(e.target.value as SkillCategoryName)
                    }
                  >
                    {SKILL_CATEGORY_NAMES.map((name) => (
                      <option key={name} value={name}>
                        {CATEGORY_LABEL[name]}
                      </option>
                    ))}
                  </select>
                  <span className="r-meta admin-mono">—</span>
                  <span className="r-actions">
                    <button
                      type="button"
                      className="admin-btn-mini"
                      data-solid="true"
                      disabled={adding || !newName.trim()}
                      onClick={handleAdd}
                    >
                      {adding ? "Adding…" : "Save"}
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
                </div>
              )}

            {groups.length === 0 && !isAdding && (
              <div className="admin-empty-row">
                <span>
                  {skills.length === 0
                    ? "No records yet."
                    : "No skills match that search."}
                </span>
              </div>
            )}

            {groups.map((group) => (
              <div key={group.name} className="admin-group">
                <div className="admin-group-head">
                  {CATEGORY_LABEL[group.name]}{" "}
                  <span className="admin-group-head-enum">
                    enum {SKILL_CATEGORY[group.name]}
                  </span>
                </div>
                {group.items.map((skill) => (
                  <div
                    key={skill.id}
                    className="admin-row"
                    data-cols="skills"
                    data-editing={editingId === skill.id}
                  >
                      {editingId === skill.id ? (
                        <>
                          <input
                            className="admin-input"
                            aria-label={`Rename ${skill.name}`}
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            autoFocus
                          />
                          <select
                            className="admin-select"
                            aria-label={`Recategorize ${skill.name}`}
                            value={editCategory}
                            onChange={(e) =>
                              setEditCategory(
                                e.target.value as SkillCategoryName
                              )
                            }
                          >
                            {SKILL_CATEGORY_NAMES.map((name) => (
                              <option key={name} value={name}>
                                {CATEGORY_LABEL[name]}
                              </option>
                            ))}
                          </select>
                          <span className="r-meta admin-mono">
                            {linkedCounts[skill.id] ?? 0}
                          </span>
                          <span className="r-actions">
                            <button
                              type="button"
                              className="admin-btn-mini"
                              data-solid="true"
                              disabled={savingId === skill.id}
                              onClick={() => saveEdit(skill.id)}
                            >
                              {savingId === skill.id ? "Saving…" : "Save"}
                            </button>
                            <button
                              type="button"
                              className="admin-btn-mini"
                              onClick={cancelEdit}
                              disabled={savingId === skill.id}
                            >
                              Cancel
                            </button>
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="r-name">{skill.name}</span>
                          <span className="r-meta admin-mono">
                            {CATEGORY_LABEL[skill.skillCategory]}
                          </span>
                          <span className="r-meta admin-mono">
                            {linkedCounts[skill.id] ?? 0}
                          </span>
                          <span className="r-actions">
                            <button
                              type="button"
                              className="admin-btn-mini"
                              data-tone="accent"
                              onClick={() => startEdit(skill)}
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
                          <div className="admin-row-stack">
                            <span className="r-meta admin-mono">
                              {CATEGORY_LABEL[skill.skillCategory]} ·{" "}
                              {linkedCounts[skill.id] ?? 0} linked
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ))}
          </>
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
