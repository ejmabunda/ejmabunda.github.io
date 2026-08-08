"use client";

import { useEffect, useState } from "react";
import type { ButtonVariant } from "@/content/types";

interface ResumePreviewProps {
  label: string;
  href: string;
  variant: ButtonVariant;
}

export default function ResumePreview({
  label,
  href,
  variant,
}: ResumePreviewProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      {/* Mobile browsers tend to render a PDF-in-iframe poorly (often
          forcing a download instead of previewing it), so below the same
          breakpoint the rest of the layout collapses at, hand off to the
          OS-native PDF viewer via a plain new-tab link instead. */}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`btn btn-${variant} hidden max-[720px]:inline-flex`}
      >
        {label}
      </a>
      <button
        type="button"
        className={`btn btn-${variant} max-[720px]:hidden`}
        onClick={() => setOpen(true)}
      >
        {label}
      </button>
      {open && (
        <div
          className="resume-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="resume-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Résumé preview"
          >
            <div className="resume-dialog-header">
              <span>Résumé</span>
              <div className="resume-dialog-actions">
                <a href={href} download className="btn btn-primary">
                  Download ↓
                </a>
                <button
                  type="button"
                  className="resume-dialog-close"
                  aria-label="Close preview"
                  onClick={() => setOpen(false)}
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="resume-dialog-body">
              <iframe
                src={`${href}#toolbar=0&navpanes=0`}
                title="Résumé preview"
                className="resume-dialog-frame"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
