"use client";

import { useEffect, useState } from "react";
import { getQualifications, type Qualification } from "@/lib/qualificationApi";
import { trackApiRequest } from "@/lib/apiWake";

export type QualificationsState =
  | { status: "loading" }
  | { status: "success"; data: Qualification[] }
  | { status: "empty" }
  | { status: "error" };

export function useQualifications(): QualificationsState {
  const [state, setState] = useState<QualificationsState>({
    status: "loading",
  });

  useEffect(() => {
    let cancelled = false;
    const settle = trackApiRequest();

    getQualifications()
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
