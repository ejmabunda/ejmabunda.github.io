"use client";

import { useEffect, useState } from "react";
import { getProfile, type ProfileApiData } from "@/lib/profileApi";
import { trackApiRequest } from "@/lib/apiWake";

export type ProfileState =
  | { status: "loading" }
  | { status: "success"; data: ProfileApiData }
  | { status: "empty" }
  | { status: "error" };

export function useProfile(): ProfileState {
  const [state, setState] = useState<ProfileState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const settle = trackApiRequest();

    getProfile()
      .then((data) => {
        if (cancelled) return;
        setState(data ? { status: "success", data } : { status: "empty" });
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
