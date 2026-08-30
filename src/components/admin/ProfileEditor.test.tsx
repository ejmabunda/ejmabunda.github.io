import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProfileEditor from "./ProfileEditor";
import {
  createProfile,
  deleteProfile,
  getProfileFresh,
  updateProfile,
  UnauthorizedError,
} from "@/lib/profileApi";
import { refreshAccessToken } from "@/lib/authApi";

vi.mock("@/lib/profileApi", () => ({
  getProfileFresh: vi.fn(),
  createProfile: vi.fn(),
  updateProfile: vi.fn(),
  deleteProfile: vi.fn(),
  UnauthorizedError: class UnauthorizedError extends Error {},
}));

vi.mock("@/lib/authApi", () => ({
  refreshAccessToken: vi.fn(),
}));

const getProfileFreshMock = vi.mocked(getProfileFresh);
const createProfileMock = vi.mocked(createProfile);
const updateProfileMock = vi.mocked(updateProfile);
const deleteProfileMock = vi.mocked(deleteProfile);
const refreshAccessTokenMock = vi.mocked(refreshAccessToken);

const sampleProfile = {
  id: 1,
  title: "Software Developer",
  headline: "Backend & Business Systems",
  subtitle: "Building production systems that stay up.",
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ProfileEditor", () => {
  it("renders the create form when no profile exists", async () => {
    getProfileFreshMock.mockResolvedValue(null);
    render(<ProfileEditor token="tok" onTokenRefreshed={vi.fn()} onLoggedOut={vi.fn()} />);

    expect(
      await screen.findByRole("heading", { name: "Create your profile" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create profile" })).toBeInTheDocument();
    expect(screen.queryByText("Delete profile")).not.toBeInTheDocument();
  });

  it("renders the edit form pre-filled when a profile exists", async () => {
    getProfileFreshMock.mockResolvedValue(sampleProfile);
    render(<ProfileEditor token="tok" onTokenRefreshed={vi.fn()} onLoggedOut={vi.fn()} />);

    expect(
      await screen.findByRole("heading", { name: "Edit your profile" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue(sampleProfile.title);
    expect(screen.getByLabelText("Headline")).toHaveValue(sampleProfile.headline);
    expect(screen.getByLabelText("Subtitle")).toHaveValue(sampleProfile.subtitle);
    expect(screen.getByText("Delete profile")).toBeInTheDocument();
  });

  it("shows a load-error state when fetching the profile fails", async () => {
    getProfileFreshMock.mockRejectedValue(new Error("network error"));
    render(<ProfileEditor token="tok" onTokenRefreshed={vi.fn()} onLoggedOut={vi.fn()} />);

    expect(
      await screen.findByRole("heading", { name: "Couldn't load profile" })
    ).toBeInTheDocument();
  });

  it("creates a profile and shows the success banner", async () => {
    getProfileFreshMock.mockResolvedValue(null);
    createProfileMock.mockResolvedValue(sampleProfile);
    render(<ProfileEditor token="tok" onTokenRefreshed={vi.fn()} onLoggedOut={vi.fn()} />);

    await screen.findByRole("heading", { name: "Create your profile" });
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: sampleProfile.title },
    });
    fireEvent.change(screen.getByLabelText("Headline"), {
      target: { value: sampleProfile.headline },
    });
    fireEvent.change(screen.getByLabelText("Subtitle"), {
      target: { value: sampleProfile.subtitle },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create profile" }));

    await waitFor(() =>
      expect(
        screen.getByText("Profile saved. Changes are live now.")
      ).toBeInTheDocument()
    );
    expect(createProfileMock).toHaveBeenCalledWith("tok", {
      title: sampleProfile.title,
      headline: sampleProfile.headline,
      subtitle: sampleProfile.subtitle,
    });
    expect(
      screen.getByRole("heading", { name: "Edit your profile" })
    ).toBeInTheDocument();
  });

  it("logs out when saving 401s and the token can't be refreshed", async () => {
    getProfileFreshMock.mockResolvedValue(sampleProfile);
    updateProfileMock.mockRejectedValue(new UnauthorizedError());
    refreshAccessTokenMock.mockResolvedValue(null);
    const onLoggedOut = vi.fn();
    render(<ProfileEditor
        token="tok"
        onTokenRefreshed={vi.fn()}
        onLoggedOut={onLoggedOut}
      />);

    await screen.findByRole("heading", { name: "Edit your profile" });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(onLoggedOut).toHaveBeenCalledTimes(1));
  });

  it("refreshes the access token on a 401 and retries the save", async () => {
    getProfileFreshMock.mockResolvedValue(sampleProfile);
    updateProfileMock
      .mockRejectedValueOnce(new UnauthorizedError())
      .mockResolvedValueOnce(sampleProfile);
    refreshAccessTokenMock.mockResolvedValue("new-tok");
    const onTokenRefreshed = vi.fn();
    const onLoggedOut = vi.fn();
    render(
      <ProfileEditor
        token="tok"
        onTokenRefreshed={onTokenRefreshed}
        onLoggedOut={onLoggedOut}
      />
    );

    await screen.findByRole("heading", { name: "Edit your profile" });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(
        screen.getByText("Profile saved. Changes are live now.")
      ).toBeInTheDocument()
    );
    expect(onTokenRefreshed).toHaveBeenCalledWith("new-tok");
    expect(updateProfileMock).toHaveBeenNthCalledWith(2, "new-tok", {
      title: sampleProfile.title,
      headline: sampleProfile.headline,
      subtitle: sampleProfile.subtitle,
    });
    expect(onLoggedOut).not.toHaveBeenCalled();
  });

  it("deletes the profile via the confirmation modal and returns to the create state", async () => {
    getProfileFreshMock.mockResolvedValue(sampleProfile);
    deleteProfileMock.mockResolvedValue(undefined);
    render(<ProfileEditor token="tok" onTokenRefreshed={vi.fn()} onLoggedOut={vi.fn()} />);

    await screen.findByRole("heading", { name: "Edit your profile" });
    fireEvent.click(screen.getByText("Delete profile"));
    expect(screen.getByRole("heading", { name: "Delete profile?" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(deleteProfileMock).toHaveBeenCalledWith("tok"));
    expect(
      await screen.findByRole("heading", { name: "Create your profile" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls onLoggedOut when the log-out link is clicked", async () => {
    getProfileFreshMock.mockResolvedValue(sampleProfile);
    const onLoggedOut = vi.fn();
    render(<ProfileEditor
        token="tok"
        onTokenRefreshed={vi.fn()}
        onLoggedOut={onLoggedOut}
      />);

    await screen.findByRole("heading", { name: "Edit your profile" });
    fireEvent.click(screen.getByText("log out"));

    expect(onLoggedOut).toHaveBeenCalledTimes(1);
  });
});
