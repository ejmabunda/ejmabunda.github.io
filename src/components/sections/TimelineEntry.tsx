import Tag from "@/components/ui/Tag";
import { CATEGORY_TONE, type Skill } from "@/lib/skillApi";

export interface TimelineEntryProps {
  role: string;
  org: string;
  dateRange: string;
  /** Timeline dot colour — assigned client-side (the API carries no tone). */
  tone: "accent" | "accent-2";
  bullets: string[];
  /** Skills applied in this role, rendered as a chip cluster under the header. */
  skills?: Skill[];
  isLast: boolean;
}

export default function TimelineEntry({
  role,
  org,
  dateRange,
  tone,
  bullets,
  skills,
  isLast,
}: TimelineEntryProps) {
  return (
    <div className="flex gap-4 pb-8 last:pb-0">
      <div className="flex w-4 flex-none flex-col items-center">
        <span
          className={`h-3.5 w-3.5 flex-none rounded-full ${
            tone === "accent" ? "bg-accent" : "bg-accent-2"
          }`}
        />
        {!isLast && <span className="mt-1 w-0.5 flex-1 bg-divider" />}
      </div>
      <div className="flex-1">
        <h4>{role}</h4>
        <p className="text-muted mb-2 text-sm">
          {org} · {dateRange}
        </p>
        {skills && skills.length > 0 && (
          <div className="skill-tags mb-3">
            {skills.map((skill) => (
              <Tag key={skill.id} tone={CATEGORY_TONE[skill.skillCategory]}>
                {skill.name}
              </Tag>
            ))}
          </div>
        )}
        <ul className="flex max-w-[640px] flex-col gap-2 pl-[18px] text-sm opacity-85">
          {bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
