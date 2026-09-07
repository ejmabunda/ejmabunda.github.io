"use client";

import { useEffect, useState } from "react";
import { getSkills, type Skill } from "@/lib/skillApi";
import { trackApiRequest } from "@/lib/apiWake";

export type SkillsState =
  | { status: "loading" }
  | { status: "success"; data: Skill[] }
  | { status: "empty" }
  | { status: "error" };

export function useSkills(): SkillsState {
  const [state, setState] = useState<SkillsState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const settle = trackApiRequest();

    getSkills()
      .then((data) => {
        if (cancelled) return;
        setState(
          data.length > 0
            ? { status: "success", data }
            : { status: "empty" }
        );
      })
      .catch(() => {
        if (cancelled) return;
        setState({ status: "error" });
      })
      .finally(settle);

    return () => {
      cancelled = true;
      settle();
    };
  }, []);

  return state;
}
