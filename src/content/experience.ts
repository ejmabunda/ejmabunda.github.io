import type { ExperienceEntry } from "./types";

export const experience: ExperienceEntry[] = [
  {
    role: "Software Developer",
    org: "Xiquel",
    dateRange: "Feb 2026 – Present",
    tone: "accent",
    bullets: [
      "Responsible for backend development and production support for an end-to-end recruitment platform serving the Department of Correctional Services — vacancy creation through interviews, panel scoring, and offers, live in production.",
      "Built an automated interview-scheduling feature (C#/.NET, Ical.Net) that distributes scoring links and calendar invites to panel members automatically, eliminating manual coordination for every interview cycle.",
      "Refactored a legacy JavaScript codebase into a state-driven architecture and introduced its first automated test suite (Jest) — including full coverage of multi-tier approval logic — cutting regression risk on the platform's most business-critical workflow.",
      "Handled production support for a live government system: diagnosed and resolved cross-stack issues including backend exceptions, async race conditions, and SQL correlated-subquery bugs. One fix resolved a document-classification defect that had been silently blocking candidates from submitting applications.",
      "Built backend API integrations connecting a candidate-facing portal to core CRM data.",
      "Wrote and optimized SQL Server queries across recruitment data for reporting and root-cause investigations used in production incident response.",
      "Designed cross-client HTML email templates (including Outlook/VML fallbacks) for automated candidate and panel communications.",
    ],
  },
  {
    role: "Volunteer Technical Mentor",
    org: "WeThinkCode_",
    dateRange: "Sep – Dec 2025",
    tone: "accent-2",
    bullets: [
      "Mentored an incoming cohort of software engineering students alongside my own studies, supporting onboarding and technical growth.",
      "Led code pairing sessions and reviewed student submissions and commits, reinforcing software engineering best practices.",
      "Facilitated PechaKucha-style presentations to build mentees' communication and technical-storytelling skills.",
      "Partnered with the Student Performance team through standups and retrospectives to track mentee progress and escalate blockers.",
    ],
  },
];
