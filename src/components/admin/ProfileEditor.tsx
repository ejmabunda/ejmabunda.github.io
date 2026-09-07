"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  createProfile,
  deleteProfile,
  getProfileFresh,
  updateProfile,
  UnauthorizedError,
  type ProfileApiData,
} from "@/lib/profileApi";
import { refreshAccessToken } from "@/lib/authApi";
import DeleteConfirmModal from "./DeleteConfirmModal";

interface ProfileEditorProps {
  token: string;
  onTokenRefreshed: (token: string) => void;
  onLoggedOut: () => void;
}

type LoadStatus = "loading" | "loaded" | "error";
type Mode = "empty" | "populated";
type SaveStatus = "idle" | "saving" | "success" | "error";

const BLANK = { title: "", headline: "", subtitle: "" };

export default function ProfileEditor({
  token,
  onTokenRefreshed,
  onLoggedOut,
}: ProfileEditorProps) {
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [mode, setMode] = useState<Mode>("empty");
  const [form, setForm] = useState(BLANK);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const savedRef = useRef(BLANK);

  useEffect(() => {
    let cancelled = false;
    getProfileFresh()
      .then((data) => {
        if (cancelled) return;
        applyProfile(data);
        setLoadStatus("loaded");
      })
      .catch(() => {
        if (cancelled) return;
        setLoadStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function applyProfile(data: ProfileApiData | null) {
    const next = data
      ? { title: data.title, headline: data.headline, subtitle: data.subtitle }
      : BLANK;
    setMode(data ? "populated" : "empty");
    setForm(next);
    savedRef.current = next;
  }

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (saveStatus === "success") setSaveStatus("idle");
  }

  async function runAuthed<T>(call: (token: string) => Promise<T>): Promise<T> {
    try {
      return await call(token);
    } catch (err) {
      if (!(err instanceof UnauthorizedError)) throw err;
      const fresh = await refreshAccessToken();
      if (!fresh) throw err;
      onTokenRefreshed(fresh);
      return call(fresh);
    }
  }

  const isPopulated = mode === "populated";
  const dirty =
    form.title !== savedRef.current.title ||
    form.headline !== savedRef.current.headline ||
    form.subtitle !== savedRef.current.subtitle;
  const canSave =
    saveStatus !== "saving" &&
    form.title.trim() !== "" &&
    form.headline.trim() !== "" &&
    form.subtitle.trim() !== "";

  const handleSave = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!canSave) return;
    setSaveStatus("saving");
    try {
      const payload = {
        title: form.title.trim(),
        headline: form.headline.trim(),
        subtitle: form.subtitle.trim(),
      };
      const data = await runAuthed((t) =>
        mode === "empty"
          ? createProfile(t, payload)
          : updateProfile(t, payload)
      );
      applyProfile(data);
      setSaveStatus("success");
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        onLoggedOut();
        return;
      }
      setSaveStatus("error");
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await runAuthed((t) => deleteProfile(t));
      setShowDeleteModal(false);
      applyProfile(null);
      setSaveStatus("idle");
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        onLoggedOut();
        return;
      }
    } finally {
      setDeleting(false);
    }
  };

  const primaryLabel =
    saveStatus === "saving"
      ? "Saving…"
      : isPopulated
      ? "Save changes"
      : "Create profile";
  const status = dirty ? "unsaved changes" : "all changes saved";

  return (
    <>
      <div className="admin-actionbar">
        <div className="admin-actionbar-title">
          Profile
          <span className="admin-pill">
            {isPopulated ? "live" : "not published"}
          </span>
        </div>
        <span
          className="admin-actionbar-status"
          data-dirty={dirty}
        >
          {loadStatus === "loaded" ? status : ""}
        </span>
        <div className="admin-actionbar-actions">
          {isPopulated && (
            <button
              type="button"
              className="admin-btn-mini"
              data-tone="danger"
              onClick={() => setShowDeleteModal(true)}
            >
              Delete
            </button>
          )}
          <button
            type="button"
            className="admin-btn-action"
            disabled={!canSave || loadStatus !== "loaded"}
            data-idle={!dirty && loadStatus === "loaded"}
            onClick={() => handleSave()}
          >
            {saveStatus === "saving" && (
              <span className="admin-spinner" aria-hidden="true" />
            )}
            {primaryLabel}
          </button>
        </div>
      </div>

      <div className="admin-body">
        {loadStatus === "loading" && (
          <p className="admin-subtext">Loading…</p>
        )}

        {loadStatus === "error" && (
          <div className="admin-card" style={{ padding: 24 }}>
            <h1 className="admin-h1">Couldn&apos;t load profile</h1>
            <p className="admin-subtext">
              Something went wrong fetching your profile. Refresh to try again.
            </p>
          </div>
        )}

        {loadStatus === "loaded" && (
          <div className="admin-content-grid">
            <div className="admin-card" style={{ padding: "26px 26px 28px" }}>
              <h3 className="admin-h2">Public information</h3>
              <p className="admin-subtext">
                {isPopulated
                  ? "Here you can edit the public information shown on your site. Changes go live immediately."
                  : "No profile exists yet. Fill these in to publish one."}
              </p>

              {saveStatus === "success" && (
                <div className="admin-success-banner">
                  Profile saved. Changes are live now.
                </div>
              )}
              {saveStatus === "error" && (
                <div className="admin-error-banner">
                  Couldn&apos;t save changes. Try again.
                </div>
              )}

              <form onSubmit={handleSave} className="admin-field-grid-2">
                <div className="admin-field">
                  <label className="admin-label" htmlFor="admin-title">
                    Title
                  </label>
                  <input
                    id="admin-title"
                    type="text"
                    value={form.title}
                    onChange={(e) => set("title", e.target.value)}
                    placeholder="Software Developer"
                    className="admin-input-plain"
                  />
                </div>
                <div className="admin-field">
                  <label className="admin-label" htmlFor="admin-headline">
                    Headline
                  </label>
                  <input
                    id="admin-headline"
                    type="text"
                    value={form.headline}
                    onChange={(e) => set("headline", e.target.value)}
                    placeholder="Backend & Business Systems"
                    className="admin-input-plain"
                  />
                </div>
                <div className="admin-field admin-field-full">
                  <label className="admin-label" htmlFor="admin-subtitle">
                    Subtitle
                  </label>
                  <textarea
                    id="admin-subtitle"
                    value={form.subtitle}
                    onChange={(e) => set("subtitle", e.target.value)}
                    placeholder="A one-line summary shown under your name."
                    className="admin-textarea"
                    style={{ minHeight: 66 }}
                  />
                </div>
              </form>

              {isPopulated && (
                <button
                  type="button"
                  className="admin-danger-link"
                  onClick={() => setShowDeleteModal(true)}
                >
                  Delete profile
                </button>
              )}
            </div>

            <aside className="admin-context">
              <div className="admin-context-panel">
                <span className="admin-context-label">RECORD</span>
                <div className="admin-context-row">
                  <span>status</span>
                  <b data-accent={isPopulated}>
                    {isPopulated ? "published" : "no record"}
                  </b>
                </div>
                <div className="admin-context-row">
                  <span>fields</span>
                  <b>
                    {
                      [form.title, form.headline, form.subtitle].filter(
                        (v) => v.trim() !== ""
                      ).length
                    }{" "}
                    / 3
                  </b>
                </div>
                <div className="admin-context-row">
                  <span>unsaved</span>
                  <b data-accent={dirty}>{dirty ? "yes" : "no"}</b>
                </div>
              </div>
              <div className="admin-context-panel">
                <span className="admin-context-label">PREVIEW</span>
                <div className="admin-preview-profile">
                  <span className="p-title">
                    {form.title || "Your title"}
                  </span>
                  <span className="p-headline">
                    {form.headline || "Your headline"}
                  </span>
                  <span className="p-subtitle">
                    {form.subtitle || "Your subtitle appears here."}
                  </span>
                </div>
              </div>
            </aside>
          </div>
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
