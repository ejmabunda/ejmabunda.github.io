"use client";

import { useEffect } from "react";

interface DeleteConfirmModalProps {
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteConfirmModal({
  deleting,
  onCancel,
  onConfirm,
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
          Delete profile?
        </h2>
        <p className="admin-subtext">
          This removes your public profile information from the site. This
          can&apos;t be undone.
        </p>
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
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
