import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
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

function renderEditor(overrides: Partial<React.ComponentProps<typeof ProfileEditor>> = {}) {
  return render(
    <ProfileEditor
      token="tok"
      onTokenRefreshed={vi.fn()}
      onLoggedOut={vi.fn()}
      {...overrides}
    />
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ProfileEditor", () => {
  it("shows the create framing when no profile exists", async () => {
    getProfileFreshMock.mockResolvedValue(null);
    renderEditor();

    expect(
      await screen.findByRole("button", { name: "Create profile" })
    ).toBeInTheDocument();
    expect(screen.getByText("not published")).toBeInTheDocument();
    expect(screen.queryByText("Delete profile")).not.toBeInTheDocument();
  });

  it("pre-fills the fields when a profile exists", async () => {
    getProfileFreshMock.mockResolvedValue(sampleProfile);
    renderEditor();

    expect(
      await screen.findByRole("button", { name: "Save changes" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue(sampleProfile.title);
    expect(screen.getByLabelText("Headline")).toHaveValue(sampleProfile.headline);
    expect(screen.getByLabelText("Subtitle")).toHaveValue(sampleProfile.subtitle);
    expect(screen.getByText("Delete profile")).toBeInTheDocument();
    expect(screen.getByText("live")).toBeInTheDocument();
  });

  it("shows a load-error state when fetching fails", async () => {
    getProfileFreshMock.mockRejectedValue(new Error("network error"));
    renderEditor();

    expect(
      await screen.findByRole("heading", { name: "Couldn't load profile" })
    ).toBeInTheDocument();
  });

  it("keeps the save button disabled until every field is filled, then creates", async () => {
    getProfileFreshMock.mockResolvedValue(null);
    createProfileMock.mockResolvedValue(sampleProfile);
    renderEditor();

    const save = await screen.findByRole("button", { name: "Create profile" });
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: sampleProfile.title },
    });
    fireEvent.change(screen.getByLabelText("Headline"), {
      target: { value: sampleProfile.headline },
    });
    fireEvent.change(screen.getByLabelText("Subtitle"), {
      target: { value: sampleProfile.subtitle },
    });
    expect(save).toBeEnabled();
    fireEvent.click(save);

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
      screen.getByRole("button", { name: "Save changes" })
    ).toBeInTheDocument();
  });

  it("logs out when saving 401s and the token can't be refreshed", async () => {
    getProfileFreshMock.mockResolvedValue(sampleProfile);
    updateProfileMock.mockRejectedValue(new UnauthorizedError());
    refreshAccessTokenMock.mockResolvedValue(null);
    const onLoggedOut = vi.fn();
    renderEditor({ onLoggedOut });

    fireEvent.click(await screen.findByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(onLoggedOut).toHaveBeenCalledTimes(1));
  });

  it("refreshes the token on a 401 and retries the save", async () => {
    getProfileFreshMock.mockResolvedValue(sampleProfile);
    updateProfileMock
      .mockRejectedValueOnce(new UnauthorizedError())
      .mockResolvedValueOnce(sampleProfile);
    refreshAccessTokenMock.mockResolvedValue("new-tok");
    const onTokenRefreshed = vi.fn();
    renderEditor({ onTokenRefreshed });

    fireEvent.click(await screen.findByRole("button", { name: "Save changes" }));

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
  });

  it("deletes the profile via the confirm modal and returns to the create state", async () => {
    getProfileFreshMock.mockResolvedValue(sampleProfile);
    deleteProfileMock.mockResolvedValue(undefined);
    renderEditor();

    await screen.findByRole("button", { name: "Save changes" });
    fireEvent.click(screen.getByText("Delete profile"));

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "Delete profile?" })
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(deleteProfileMock).toHaveBeenCalledWith("tok"));
    expect(
      await screen.findByRole("button", { name: "Create profile" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
