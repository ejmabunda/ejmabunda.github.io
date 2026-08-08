import type { HeroCta } from "./types";
import { site } from "./site";

export const profile = {
    name: "Matimu Mabunda",
    subtitle: "Software Developer — Backend & Business Systems",
    bio: "Production experience building and maintaining backend systems, APIs, and automated business logic in C#/.NET and SQL Server. Currently responsible for an end-to-end recruitment platform (built on Microsoft Dynamics 365) live in production for a government department - from architecture decisions through ongoing incident response. Comfortable across the stack: server-side logic, client-side scripting, data modelling, and integrations.",
    photo: {
        src: "/pfp.webp",
        alt: "Matimu Mabunda",
    },
    heroCtas: [
        {
            label: "LinkedIn ↗",
            href: "https://www.linkedin.com/in/ejmabunda",
            variant: "primary",
            external: true,
        },
        {
            label: "Résumé",
            href: site.resumeHref,
            variant: "secondary",
            kind: "preview",
        },
        {
            label: "GitHub ↗",
            href: "https://www.github.com/ejmabunda",
            variant: "secondary",
            external: true,
        },
    ] satisfies HeroCta[],
};
