"use client";

import { useEffect, useState } from "react";
import { getProfile, type ProfileApiData } from "@/lib/profileApi";

export type ProfileState =
  | { status: "loading" }
  | { status: "success"; data: ProfileApiData }
  | { status: "empty" }
  | { status: "error" };

export function useProfile(): ProfileState {
  const [state, setState] = useState<ProfileState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    getProfile()
      .then((data) => {
        if (cancelled) return;
        setState(data ? { status: "success", data } : { status: "empty" });
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
