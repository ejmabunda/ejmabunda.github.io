import type { SkillGroup } from "./types";

// Fallback for the Skills section: rendered when the Skill API returns an
// empty list or fails, so the section is never blank. The live list from
// `GET /api/Skill` takes over once it loads. Group labels/order here mirror
// `CATEGORY_LABEL` / `SKILL_CATEGORY_NAMES` in `@/lib/skillApi`.
export const skills: SkillGroup[] = [
  {
    label: "Languages & Backend",
    tone: "accent",
    items: [
      "C#",
      ".NET",
      "ASP.NET Web API",
      "REST",
      "JSON",
      "T-SQL",
      "JavaScript (ES6+)",
      "Python",
    ],
  },
  {
    label: "Systems & Data",
    tone: "accent-2",
    items: [
      "SQL Server",
      "Process automation",
      "Data modelling",
      "API integrations",
    ],
  },
  {
    label: "Platform",
    tone: "neutral",
    items: ["Dynamics 365 / CRM", "Plugins", "Execute requests", "Form scripting"],
  },
  {
    label: "Testing & Reliability",
    tone: "outline",
    items: [
      "Jest",
      "Automated test suite design",
      "Incident triage",
      "Root-cause analysis",
      "Code review",
    ],
  },
  {
    label: "Cloud & DevOps",
    tone: "outline",
    items: ["AWS (CloudFormation, ECS, Fargate)", "CI/CD pipelines", "Docker", "Git", "GitHub"],
  },
];
