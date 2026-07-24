import type { NavLink } from "./types";

export const site = {
  // OPEN ITEM: designer's placeholder choice, echoes WeThinkCode_ styling — confirmed with user, keeping as-is.
  brand: "ejmabunda_",
  domain: "ejmabunda.dev",
  email: "mjmabunda0@gmail.com",
  location: "Johannesburg, SA",
  navLinks: [
    { label: "about", href: "#about" },
    { label: "experience", href: "#exp" },
    { label: "skills", href: "#skills" },
  ] as NavLink[],
  resumeHref: "/Resume.pdf",
};
