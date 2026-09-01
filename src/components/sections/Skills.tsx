"use client";

import Tag from "@/components/ui/Tag";
import Eyebrow from "@/components/ui/Eyebrow";
import Skeleton from "@/components/ui/Skeleton";
import type { TagTone } from "@/content/types";
import { skills as fallbackSkills } from "@/content/skills";
import { useSkills } from "@/hooks/useSkills";
import {
  CATEGORY_LABEL,
  SKILL_CATEGORY_NAMES,
  type Skill,
  type SkillCategoryName,
} from "@/lib/skillApi";

// Tag colour per category — matches the tones the section used when the list
// was static content, so the live version looks identical once populated.
const CATEGORY_TONE: Record<SkillCategoryName, TagTone> = {
  LanguagesAndBackend: "accent",
  SystemsAndData: "accent-2",
  Platform: "neutral",
  TestingAndReliability: "outline",
  CloudAndDevOps: "outline",
};

interface RenderGroup {
  label: string;
  tone: TagTone;
  items: string[];
}

// The list endpoint gives a flat array in no guaranteed order — group by
// category (canonical order) and sort names within each group client-side.
function groupLiveSkills(list: Skill[]): RenderGroup[] {
  return SKILL_CATEGORY_NAMES.map((name) => ({
    label: CATEGORY_LABEL[name],
    tone: CATEGORY_TONE[name],
    items: list
      .filter((skill) => skill.skillCategory === name)
      .map((skill) => skill.name)
      .sort((a, b) => a.localeCompare(b)),
  })).filter((group) => group.items.length > 0);
}

const SKELETON_ROWS = [3, 4, 4, 5, 5];

export default function Skills() {
  const state = useSkills();

  // On empty or error, fall back to the bundled list rather than dropping the
  // section — skills change rarely and a blank section reads as broken.
  const groups: RenderGroup[] =
    state.status === "success" ? groupLiveSkills(state.data) : fallbackSkills;

  return (
    <section id="skills" className="wrap pt-10 pb-10">
      <Eyebrow>Core skills</Eyebrow>

      {state.status === "loading" ? (
        <div
          className="flex flex-col gap-[14px]"
          aria-busy="true"
          aria-label="Loading skills"
        >
          {SKELETON_ROWS.map((tagCount, row) => (
            <div key={row} className="skill-row">
              <Skeleton height="15px" className="w-[120px]" />
              <div className="skill-tags">
                {Array.from({ length: tagCount }).map((_, i) => (
                  <Skeleton
                    key={i}
                    height="20px"
                    rounded="full"
                    className="w-[72px]"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-[14px]">
          {groups.map((group) => (
            <div key={group.label} className="skill-row">
              <div className="skill-label">{group.label}</div>
              <div className="skill-tags">
                {group.items.map((item) => (
                  <Tag key={item} tone={group.tone}>
                    {item}
                  </Tag>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
