"use client";

import Eyebrow from "@/components/ui/Eyebrow";
import Skeleton from "@/components/ui/Skeleton";
import { useQualifications } from "@/hooks/useQualifications";
import type { Qualification } from "@/lib/qualificationApi";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// The API value is `"2024-01-01T00:00:00"` with no zone — parsing it through
// `new Date()` and formatting in local time can shift it across a month
// boundary. Read the calendar year-month straight off the string instead.
function formatMonth(iso: string): string {
  const [year, month] = iso.split("-");
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

// A qualification awarded in the month it started (e.g. a matric certificate)
// shows a single date rather than "Dec 2017 – Dec 2017".
function formatDateRange(startDate: string, endDate: string | null): string {
  const start = formatMonth(startDate);
  if (endDate === null) return `${start} – Present`;
  const end = formatMonth(endDate);
  return start === end ? start : `${start} – ${end}`;
}

function meta(q: Qualification): string {
  return `${q.institution} · ${formatDateRange(q.startDate, q.endDate)}`;
}

const SKELETON_WIDTHS = ["w-[320px]", "w-[260px]"];

export default function Education() {
  const state = useQualifications();

  return (
    <section className="wrap pt-10 pb-12">
      <Eyebrow>Education</Eyebrow>

      {state.status === "loading" && (
        <div
          className="flex flex-col gap-[10px]"
          aria-busy="true"
          aria-label="Loading education"
        >
          {SKELETON_WIDTHS.map((width) => (
            <Skeleton
              key={width}
              height="16px"
              className={`${width} max-w-full`}
            />
          ))}
        </div>
      )}

      {state.status === "error" && (
        <p role="alert" className="max-w-[600px] text-[17px] opacity-85">
          Couldn&apos;t load education content. Please refresh the page to try
          again.
        </p>
      )}

      {state.status === "empty" && (
        <p className="max-w-[600px] text-[17px] opacity-85">
          Education content isn&apos;t available right now.
        </p>
      )}

      {/* `GET /api/Qualification` already orders newest first — keep it. */}
      {state.status === "success" && (
        <div className="flex flex-col gap-[10px] text-sm">
          {state.data.map((q) => (
            <div key={q.id} className="flex flex-wrap gap-[10px]">
              <strong className="font-semibold">{q.name}</strong>
              <span className="text-muted">{meta(q)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
