import type { ExperienceEntry } from "@/content/types";

interface TimelineEntryProps extends ExperienceEntry {
  isLast: boolean;
}

export default function TimelineEntry({
  role,
  org,
  dateRange,
  tone,
  bullets,
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
        <ul className="flex max-w-[640px] flex-col gap-2 pl-[18px] text-sm opacity-85">
          {bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
