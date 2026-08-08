export type TagTone = "accent" | "accent-2" | "neutral" | "outline";

export type ButtonVariant = "primary" | "secondary";

export interface NavLink {
  label: string;
  href: string;
}

export interface HeroCta {
  label: string;
  href: string;
  variant: ButtonVariant;
  external?: boolean;
  /** "preview" opens the résumé in an in-page dialog instead of navigating. */
  kind?: "link" | "preview";
}

export interface SkillGroup {
  label: string;
  tone: TagTone;
  items: string[];
}

export interface ExperienceEntry {
  role: string;
  org: string;
  dateRange: string;
  tone: "accent" | "accent-2";
  bullets: string[];
}

export interface EducationEntry {
  label: string;
  meta: string;
}
