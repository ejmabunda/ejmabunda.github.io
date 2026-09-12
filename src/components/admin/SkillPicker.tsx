"use client";

import type { SkillCategoryName, Skill } from "@/lib/skillApi";

interface SkillGroup {
  name: SkillCategoryName;
  label: string;
  items: Skill[];
}

interface SkillPickerProps {
  groups: SkillGroup[];
  pickedSkillIds: string[];
  onChange: (ids: string[]) => void;
}

/**
 * The `skillIds` picker shared by the Experience / Qualifications /
 * Certifications editors: one block per skill category, each a row of
 * toggle pills. Toggling only updates local state — nothing is written
 * until the editor's own Save.
 */
export default function SkillPicker({
  groups,
  pickedSkillIds,
  onChange,
}: SkillPickerProps) {
  function toggle(id: string) {
    onChange(
      pickedSkillIds.includes(id)
        ? pickedSkillIds.filter((x) => x !== id)
        : [...pickedSkillIds, id]
    );
  }

  return (
    <div className="admin-skill-picker">
      <div className="admin-skill-picker-head">
        <span className="admin-label" style={{ margin: 0 }}>
          skillIds
        </span>
        <span className="admin-skill-picker-count admin-mono">
          {pickedSkillIds.length} linked
        </span>
      </div>
      {groups.length === 0 ? (
        <p className="admin-subtext" style={{ margin: 0 }}>
          Add skills under the Skills tab first — records link to them.
        </p>
      ) : (
        groups.map((group) => (
          <div key={group.name} className="admin-skill-picker-group">
            <span className="admin-skill-picker-group-label">
              {group.label.toUpperCase()}
            </span>
            <div className="admin-skill-picker-items">
              {group.items.map((skill) => (
                <button
                  key={skill.id}
                  type="button"
                  className="admin-toggle-pill"
                  data-on={pickedSkillIds.includes(skill.id)}
                  onClick={() => toggle(skill.id)}
                >
                  {skill.name}
                </button>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
