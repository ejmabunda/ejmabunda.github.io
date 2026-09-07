"use client";

import { useSyncExternalStore } from "react";
import { isApiWaking, subscribeApiWake } from "@/lib/apiWake";

/**
 * `true` while a data request has been pending long enough that the free-tier
 * backend is most likely cold-starting. See `@/lib/apiWake`.
 */
export function useApiWaking(): boolean {
  return useSyncExternalStore(subscribeApiWake, isApiWaking, () => false);
}
