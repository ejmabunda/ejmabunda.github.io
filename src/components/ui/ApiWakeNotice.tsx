"use client";

import { useEffect, useState } from "react";
import { useApiWaking } from "@/hooks/useApiWaking";

/**
 * Toast that appears when the backend has been unresponsive for a few seconds
 * — almost always the free-tier App Service cold-starting. It clears itself as
 * soon as the data loads; the sections show their own error copy if it never
 * does.
 */
export default function ApiWakeNotice() {
  const waking = useApiWaking();
  const [dismissed, setDismissed] = useState(false);

  // If a later request stalls after an earlier notice was dismissed, surface
  // it again rather than staying silent.
  useEffect(() => {
    if (waking) setDismissed(false);
  }, [waking]);

  const show = waking && !dismissed;

  return (
    <div className="wake-notice-region" role="status" aria-live="polite">
      {show && (
        <div className="wake-notice">
          <span className="wake-notice-dot" aria-hidden="true" />
          <p className="wake-notice-text">
            Waking the server up. It sleeps on the free cloud tier when idle, so
            the first load after a while can take up to a minute.
          </p>
          <button
            type="button"
            className="wake-notice-close"
            aria-label="Dismiss notice"
            onClick={() => setDismissed(true)}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
