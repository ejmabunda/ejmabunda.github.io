"use client";

import { useEffect, useRef, useState } from "react";
import {
  createProfile,
  deleteProfile,
  getProfileFresh,
  UnauthorizedError,
  updateProfile,
  type ProfileInput,
} from "@/lib/profileApi";
import { runAuthed } from "@/lib/runAuthed";
import AdminHeader from "./AdminHeader";
import DeleteConfirmModal from "./DeleteConfirmModal";

interface ProfileEditorProps {
  token: string;
  onTokenRefreshed: (token: string) => void;
  onLoggedOut: () => void;
  waking: boolean;
}

const BLANK: ProfileInput = { title: "", headline: "", subtitle: "" };

type LoadStatus = "loading" | "ready" | "error";
type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function ProfileEditor({
  token,
  onTokenRefreshed,
  onLoggedOut,
  waking,
}: ProfileEditorProps) {
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [form, setForm] = useState<ProfileInput>(BLANK);
  const [isPopulated, setIsPopulated] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const savedRef = useRef<ProfileInput>(BLANK);

  useEffect(() => {
    let cancelled = false;
    getProfileFresh()
      .then((data) => {
        if (cancelled) return;
        if (data) {
          const next = {
            title: data.title,
            headline: data.headline,
            subtitle: data.subtitle,
          };
          setForm(next);
          savedRef.current = next;
          setIsPopulated(true);
        }
        setLoadStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const dirty =
    form.title !== savedRef.current.title ||
    form.headline !== savedRef.current.headline ||
    form.subtitle !== savedRef.current.subtitle;

  async function handleSave() {
    if (saveStatus === "saving") return;
    setSaveStatus("saving");
    try {
      if (isPopulated) {
        await runAuthed(token, onTokenRefreshed, (t) =>
          updateProfile(t, form)
        );
      } else {
        await runAuthed(token, onTokenRefreshed, (t) =>
          createProfile(t, form)
        );
        setIsPopulated(true);
      }
      savedRef.current = form;
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus((s) => (s === "saved" ? "idle" : s)), 2000);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        onLoggedOut();
        return;
      }
      setSaveStatus("error");
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await runAuthed(token, onTokenRefreshed, (t) => deleteProfile(t));
      setForm(BLANK);
      savedRef.current = BLANK;
      setIsPopulated(false);
      setShowDeleteModal(false);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        onLoggedOut();
        return;
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <AdminHeader
        title="Profile"
        endpoint="/api/Profile"
        waking={waking}
        onLoggedOut={onLoggedOut}
        primaryAction={
          <button
            type="button"
            className="admin-btn-primary"
            disabled={!dirty || saveStatus === "saving"}
            onClick={handleSave}
          >
            {saveStatus === "saving" && (
              <span className="admin-spinner" aria-hidden="true" />
            )}
            {saveStatus === "saving" ? "Saving…" : "Save changes"}
          </button>
        }
      />
      <div className="admin-body" style={{ maxWidth: 900 }}>
        <div className="admin-context-line">
          <span>singleton · id 1</span>
          <span>GET anonymous · PUT authorized</span>
          {saveStatus === "saved" && (
            <span className="admin-saved-flash">Saved</span>
          )}
        </div>

        {loadStatus === "error" && (
          <div className="admin-error-banner">
            This isn&rsquo;t available right now.
          </div>
        )}
        {saveStatus === "error" && (
          <div className="admin-error-banner">
            Couldn&rsquo;t save the profile. Try again.
          </div>
        )}

        {loadStatus !== "loading" && (
          <div className="admin-card">
            <div className="admin-card-body-flush admin-field-grid">
              <div className="admin-field-grid-item">
                <div className="admin-label-pair">
                  <label className="human" htmlFor="profile-title">
                    Title
                  </label>
                  <span className="api-name">title</span>
                </div>
                <div className="admin-field-grid-field">
                  <input
                    id="profile-title"
                    className="admin-input"
                    value={form.title}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, title: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="admin-field-grid-item">
                <div className="admin-label-pair">
                  <label className="human" htmlFor="profile-headline">
                    Headline
                  </label>
                  <span className="api-name">headline</span>
                </div>
                <div className="admin-field-grid-field">
                  <input
                    id="profile-headline"
                    className="admin-input"
                    value={form.headline}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, headline: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="admin-field-grid-item">
                <div className="admin-label-pair">
                  <label className="human" htmlFor="profile-subtitle">
                    Subtitle
                  </label>
                  <span className="api-name">subtitle</span>
                </div>
                <div className="admin-field-grid-field">
                  <textarea
                    id="profile-subtitle"
                    className="admin-textarea"
                    style={{ height: 58 }}
                    value={form.subtitle}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, subtitle: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="admin-preview-row">
          <p>These three fields are the entire hero section on the public site.</p>
          <button
            type="button"
            className="admin-btn-secondary"
            onClick={() => setShowPreview((s) => !s)}
          >
            {showPreview ? "Close preview" : "Open preview"}
          </button>
        </div>
        {showPreview && (
          <div className="admin-hero-preview">
            <span className="p-title">{form.title || "—"}</span>
            <span className="p-headline">{form.headline || "—"}</span>
            <span className="p-subtitle">{form.subtitle || "—"}</span>
          </div>
        )}

        {isPopulated && (
          <button
            type="button"
            className="admin-btn-text-danger"
            style={{ marginTop: 18 }}
            onClick={() => setShowDeleteModal(true)}
          >
            Delete profile
          </button>
        )}
      </div>

      {showDeleteModal && (
        <DeleteConfirmModal
          deleting={deleting}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}
