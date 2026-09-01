"use client";

import { useEffect } from "react";

interface DeleteConfirmModalProps {
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
  body?: string;
  /** Verb shown on the confirm button (defaults to "Delete" / "Deleting…"). */
  confirmLabel?: string;
  confirmingLabel?: string;
}

export default function DeleteConfirmModal({
  deleting,
  onCancel,
  onConfirm,
  title = "Delete profile?",
  body = "This removes your public profile information from the site. This can't be undone.",
  confirmLabel = "Delete",
  confirmingLabel = "Deleting…",
}: DeleteConfirmModalProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div
      className="admin-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-delete-heading"
      >
        <h2 id="admin-delete-heading" className="admin-h2">
          {title}
        </h2>
        <p className="admin-subtext">{body}</p>
        <div className="admin-modal-actions">
          <button
            type="button"
            className="admin-btn-secondary"
            onClick={onCancel}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="admin-btn-danger"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? confirmingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
