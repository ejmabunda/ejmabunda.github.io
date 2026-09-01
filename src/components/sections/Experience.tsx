"use client";

import Eyebrow from "@/components/ui/Eyebrow";
import Skeleton from "@/components/ui/Skeleton";
import TimelineEntry from "./TimelineEntry";
import { useExperiences } from "@/hooks/useExperiences";
import type { Experience as ExperienceDto } from "@/lib/experienceApi";
import type { Skill } from "@/lib/skillApi";

interface TimelineItem {
  key: string;
  role: string;
  org: string;
  dateRange: string;
  tone: "accent" | "accent-2";
  bullets: string[];
  skills: Skill[];
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// The API value is `"2026-02-02T00:00:00"` with no zone — parsing it through
// `new Date()` and formatting in local time can shift it across a month
// boundary. Read the calendar year-month straight off the string instead.
function formatMonth(iso: string): string {
  const [year, month] = iso.split("-");
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

function formatDateRange(startDate: string, endDate: string | null): string {
  const start = formatMonth(startDate);
  return endDate ? `${start} – ${formatMonth(endDate)}` : `${start} – Present`;
}

// Newest role first — `GET /api/Experience` gives no ordering guarantee. The
// dates are fixed-width ISO strings, so a lexical compare is chronological.
function byStartDateDesc(a: ExperienceDto, b: ExperienceDto): number {
  return b.startDate.localeCompare(a.startDate);
}

function toTimelineItem(exp: ExperienceDto, index: number): TimelineItem {
  return {
    key: exp.id,
    role: exp.jobTitle,
    org: exp.employer,
    dateRange: formatDateRange(exp.startDate, exp.endDate),
    // Alternate the timeline dot colour down the list, like the old static data.
    tone: index % 2 === 0 ? "accent" : "accent-2",
    bullets: exp.description
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
    skills: [...exp.skills].sort((a, b) => a.name.localeCompare(b.name)),
  };
}

const SKELETON_ENTRIES = [4, 4, 3];

export default function Experience() {
  const state = useExperiences();

  const items =
    state.status === "success"
      ? [...state.data].sort(byStartDateDesc).map(toTimelineItem)
      : [];

  return (
    <section id="exp" className="wrap pt-10 pb-10">
      <Eyebrow>Experience</Eyebrow>

      {state.status === "loading" && (
        <div
          className="flex flex-col gap-8"
          aria-busy="true"
          aria-label="Loading experience"
        >
          {SKELETON_ENTRIES.map((lineCount, entry) => (
            <div key={entry} className="flex gap-4">
              <Skeleton
                height="14px"
                width="14px"
                rounded="full"
                className="flex-none"
              />
              <div className="flex-1">
                <Skeleton height="18px" className="mb-2 w-[220px] max-w-full" />
                <Skeleton height="13px" className="mb-3 w-[160px] max-w-full" />
                <div className="flex max-w-[640px] flex-col gap-2">
                  {Array.from({ length: lineCount }).map((_, line) => (
                    <Skeleton
                      key={line}
                      height="13px"
                      className={line === lineCount - 1 ? "w-3/5" : "w-full"}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {state.status === "error" && (
        <p role="alert" className="max-w-[600px] text-[17px] opacity-85">
          Couldn&apos;t load experience content. Please refresh the page to try
          again.
        </p>
      )}

      {state.status === "empty" && (
        <p className="max-w-[600px] text-[17px] opacity-85">
          Experience content isn&apos;t available right now.
        </p>
      )}

      {state.status === "success" && (
        <div className="flex flex-col">
          {items.map((item, index) => (
            <TimelineEntry
              key={item.key}
              role={item.role}
              org={item.org}
              dateRange={item.dateRange}
              tone={item.tone}
              bullets={item.bullets}
              skills={item.skills}
              isLast={index === items.length - 1}
            />
          ))}
        </div>
      )}
    </section>
  );
}
