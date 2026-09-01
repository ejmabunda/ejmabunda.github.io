"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createExperience,
  getExperiencesFresh,
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

interface ExperiencesManagerProps {
  token: string;
  onTokenRefreshed: (token: string) => void;
  onLoggedOut: () => void;
}

type LoadStatus = "loading" | "loaded" | "error";

function byStartDateDesc(a: Experience, b: Experience): number {
  return b.startDate.localeCompare(a.startDate);
}

/** `"2026-02-02T00:00:00"` → `"2026-02"` for the compact list line. */
function yearMonth(iso: string): string {
  return iso.slice(0, 7);
}

export default function ExperiencesManager({
  token,
  onTokenRefreshed,
  onLoggedOut,
}: ExperiencesManagerProps) {
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [banner, setBanner] = useState<string | null>(null);

  const [jobTitle, setJobTitle] = useState("");
  const [employer, setEmployer] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // The form needs the real skill list to offer as a multi-select, so load
    // both together and only show the form once both are in.
    Promise.all([getExperiencesFresh(), getSkillsFresh()])
      .then(([exps, sks]) => {
        if (cancelled) return;
        setExperiences([...exps].sort(byStartDateDesc));
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
  }, []);

  const skillGroups = useMemo(
    () =>
      SKILL_CATEGORY_NAMES.map((name) => ({
        name,
        label: CATEGORY_LABEL[name],
        items: skills
          .filter((s) => s.skillCategory === name)
          .sort((a, b) => a.name.localeCompare(b.name)),
      })).filter((group) => group.items.length > 0),
    [skills]
  );

  // Runs an authed call with the current token; on a 401 mint a fresh token from
  // the refresh cookie and retry once. Matches SkillsManager.runAuthed.
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

  function toggleSkill(id: string) {
    setSelectedSkillIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function resetForm() {
    setJobTitle("");
    setEmployer("");
    setStartDate("");
    setEndDate("");
    setDescription("");
    setSelectedSkillIds([]);
  }

  const canSubmit =
    jobTitle.trim() !== "" &&
    employer.trim() !== "" &&
    startDate !== "" &&
    description.trim() !== "" &&
    !adding;

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setAdding(true);
    setBanner(null);
    try {
      const created = await runAuthed((t) =>
        createExperience(t, {
          jobTitle: jobTitle.trim(),
          employer: employer.trim(),
          startDate,
          endDate: endDate || null,
          description: description
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .join("\n"),
          skillIds: selectedSkillIds,
        })
      );
      setExperiences((prev) => [created, ...prev].sort(byStartDateDesc));
      resetForm();
    } catch (err) {
      if (handleAuthError(err)) return;
      setBanner("Couldn't add that experience. Try again.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="admin-card">
      <h1 className="admin-h1">Experience</h1>
      <p className="admin-subtext">
        Roles shown on your site&apos;s timeline. New entries go live
        immediately. Editing and removing entries isn&apos;t available yet.
      </p>

      {banner && <div className="admin-error-banner">{banner}</div>}

      {loadStatus === "loading" && <p className="admin-subtext">Loading…</p>}

      {loadStatus === "error" && (
        <p className="admin-subtext">
          Something went wrong loading your experience. Refresh to try again.
        </p>
      )}

      {loadStatus === "loaded" && (
        <>
          <form className="admin-experience-form" onSubmit={handleAdd}>
            <label className="admin-label" htmlFor="exp-job-title">
              Job title
            </label>
            <input
              id="exp-job-title"
              type="text"
              className="admin-input-plain"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Software Developer"
            />

            <label className="admin-label" htmlFor="exp-employer">
              Employer
            </label>
            <input
              id="exp-employer"
              type="text"
              className="admin-input-plain"
              value={employer}
              onChange={(e) => setEmployer(e.target.value)}
              placeholder="Xiquel"
            />

            <div className="admin-experience-dates">
              <div>
                <label className="admin-label" htmlFor="exp-start">
                  Start date
                </label>
                <input
                  id="exp-start"
                  type="date"
                  className="admin-input-plain"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="admin-label" htmlFor="exp-end">
                  End date <span className="admin-faint">(blank if ongoing)</span>
                </label>
                <input
                  id="exp-end"
                  type="date"
                  className="admin-input-plain"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <label className="admin-label" htmlFor="exp-description">
              Description <span className="admin-faint">(one bullet per line)</span>
            </label>
            <textarea
              id="exp-description"
              className="admin-textarea"
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={"Led backend development for…\nBuilt an automated…"}
            />

            <span className="admin-label">Skills</span>
            {skillGroups.length === 0 ? (
              <p className="admin-subtext">
                Add skills under the Skills tab first — experiences link to them.
              </p>
            ) : (
              <div className="admin-experience-skills">
                {skillGroups.map((group) => (
                  <fieldset
                    key={group.name}
                    className="admin-experience-skill-group"
                  >
                    <legend className="admin-skill-cat">{group.label}</legend>
                    {group.items.map((skill) => (
                      <label
                        key={skill.id}
                        className="admin-experience-skill-option"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSkillIds.includes(skill.id)}
                          onChange={() => toggleSkill(skill.id)}
                        />
                        {skill.name}
                      </label>
                    ))}
                  </fieldset>
                ))}
              </div>
            )}

            <button
              type="submit"
              className="admin-btn-primary"
              disabled={!canSubmit}
            >
              {adding && <span className="admin-spinner" aria-hidden="true" />}
              {adding ? "Adding…" : "Add experience"}
            </button>
          </form>

          {experiences.length === 0 ? (
            <p className="admin-subtext">No experience entries yet.</p>
          ) : (
            <ul className="admin-skill-list">
              {experiences.map((exp) => (
                <li key={exp.id} className="admin-skill-row">
                  <span className="admin-skill-name">{exp.jobTitle}</span>
                  <span className="admin-skill-cat">
                    {exp.employer} · {yearMonth(exp.startDate)} –{" "}
                    {exp.endDate ? yearMonth(exp.endDate) : "Present"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
