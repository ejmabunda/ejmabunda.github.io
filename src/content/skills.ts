import type { SkillGroup } from "./types";

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
    label: "Tools",
    tone: "outline",
    items: ["Git", "GitHub", "Docker"],
  },
];
