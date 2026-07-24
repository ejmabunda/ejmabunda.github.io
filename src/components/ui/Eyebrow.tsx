import type { ReactNode } from "react";

export default function Eyebrow({ children }: { children: ReactNode }) {
  return <h6 className="text-accent-700">{children}</h6>;
}
