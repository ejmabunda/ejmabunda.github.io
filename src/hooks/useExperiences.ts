"use client";

import { useEffect, useState } from "react";
import { getExperiences, type Experience } from "@/lib/experienceApi";
import { trackApiRequest } from "@/lib/apiWake";

export type ExperiencesState =
  | { status: "loading" }
  | { status: "success"; data: Experience[] }
  | { status: "empty" }
  | { status: "error" };

export function useExperiences(): ExperiencesState {
  const [state, setState] = useState<ExperiencesState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const settle = trackApiRequest();

    getExperiences()
      .then((data) => {
        if (cancelled) return;
        setState(
          data.length > 0 ? { status: "success", data } : { status: "empty" }
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
