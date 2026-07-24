import type { ReactNode } from "react";
import type { TagTone } from "@/content/types";

interface TagProps {
  tone: TagTone;
  children: ReactNode;
}

export default function Tag({ tone, children }: TagProps) {
  return <span className={`tag tag-${tone}`}>{children}</span>;
}
