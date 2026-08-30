"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
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

export default function ProfileEditor({
  token,
  onTokenRefreshed,
  onLoggedOut,
}: ProfileEditorProps) {
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [mode, setMode] = useState<Mode>("empty");
  const [title, setTitle] = useState("");
  const [headline, setHeadline] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
    if (data) {
      setMode("populated");
      setTitle(data.title);
      setHeadline(data.headline);
      setSubtitle(data.subtitle);
    } else {
      setMode("empty");
      setTitle("");
      setHeadline("");
      setSubtitle("");
    }
  }

  // Runs an authed call with the current access token. Access tokens are
  // short-lived, so on a 401 we mint a fresh one from the refresh cookie and
  // retry once. If the refresh fails the original UnauthorizedError propagates
  // and the caller's catch handles the log-out.
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

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (saveStatus === "saving") return;
    setSaveStatus("saving");
    try {
      const data = await runAuthed((t) =>
        mode === "empty"
          ? createProfile(t, { title, headline, subtitle })
          : updateProfile(t, { title, headline, subtitle })
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

  const handleLogOut = (e: React.MouseEvent) => {
    e.preventDefault();
    onLoggedOut();
  };

  const isPopulated = mode === "populated";

  return (
    <div className="admin-screen-wrap">
      <div className="admin-top-bar">
        <Link href="/" className="admin-top-link">
          ← back to site
        </Link>
        <a href="#" className="admin-top-link" onClick={handleLogOut}>
          log out
        </a>
      </div>

      {loadStatus === "loading" && (
        <div className="admin-card">
          <p className="admin-subtext">Loading…</p>
        </div>
      )}

      {loadStatus === "error" && (
        <div className="admin-card">
          <h1 className="admin-h1">Couldn&apos;t load profile</h1>
          <p className="admin-subtext">
            Something went wrong fetching your profile. Refresh to try again.
          </p>
        </div>
      )}

      {loadStatus === "loaded" && (
        <div className="admin-card">
          <h1 className="admin-h1">
            {isPopulated ? "Edit your profile" : "Create your profile"}
          </h1>
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

          <form onSubmit={handleSave}>
            <label className="admin-label" htmlFor="admin-title">
              Title
            </label>
            <input
              id="admin-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Software Developer"
              className="admin-input-plain"
              required
            />

            <label className="admin-label" htmlFor="admin-headline">
              Headline
            </label>
            <input
              id="admin-headline"
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Backend & Business Systems"
              className="admin-input-plain"
              required
            />

            <label className="admin-label" htmlFor="admin-subtitle">
              Subtitle
            </label>
            <textarea
              id="admin-subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="A one-line summary shown under your name."
              className="admin-textarea"
              required
            />

            <button
              type="submit"
              className="admin-btn-primary"
              disabled={saveStatus === "saving"}
            >
              {saveStatus === "saving" && (
                <span className="admin-spinner" aria-hidden="true" />
              )}
              {saveStatus === "saving"
                ? "Saving…"
                : isPopulated
                ? "Save changes"
                : "Create profile"}
            </button>
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
      )}

      {showDeleteModal && (
        <DeleteConfirmModal
          deleting={deleting}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
