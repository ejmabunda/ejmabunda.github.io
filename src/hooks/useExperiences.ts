"use client";

import { useEffect, useState } from "react";
import { getExperiences, type Experience } from "@/lib/experienceApi";

export type ExperiencesState =
  | { status: "loading" }
  | { status: "success"; data: Experience[] }
  | { status: "empty" }
  | { status: "error" };

export function useExperiences(): ExperiencesState {
  const [state, setState] = useState<ExperiencesState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

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
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
