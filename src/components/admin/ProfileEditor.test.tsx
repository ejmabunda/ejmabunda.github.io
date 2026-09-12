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

vi.mock("@/lib/profileApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/profileApi")>();
  return {
    ...actual,
    getProfileFresh: vi.fn(),
    createProfile: vi.fn(),
    updateProfile: vi.fn(),
    deleteProfile: vi.fn(),
  };
});

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

function renderEditor(
  overrides: Partial<React.ComponentProps<typeof ProfileEditor>> = {}
) {
  return render(
    <ProfileEditor
      token="tok"
      onTokenRefreshed={vi.fn()}
      onLoggedOut={vi.fn()}
      waking={false}
      {...overrides}
    />
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ProfileEditor", () => {
  it("shows an empty form with the save action disabled when no profile exists", async () => {
    getProfileFreshMock.mockResolvedValue(null);
    renderEditor();

    const save = await screen.findByRole("button", { name: "Save changes" });
    expect(save).toBeDisabled();
    expect(screen.getByLabelText("Title")).toHaveValue("");
    expect(screen.queryByText("Delete profile")).not.toBeInTheDocument();
  });

  it("pre-fills the fields when a profile exists", async () => {
    getProfileFreshMock.mockResolvedValue(sampleProfile);
    renderEditor();

    await screen.findByText("Delete profile");
    expect(screen.getByLabelText("Title")).toHaveValue(sampleProfile.title);
    expect(screen.getByLabelText("Headline")).toHaveValue(
      sampleProfile.headline
    );
    expect(screen.getByLabelText("Subtitle")).toHaveValue(
      sampleProfile.subtitle
    );
  });

  it("shows a load-error banner when fetching fails", async () => {
    getProfileFreshMock.mockRejectedValue(new Error("network error"));
    renderEditor();

    expect(
      await screen.findByText(/this isn.t available right now/i)
    ).toBeInTheDocument();
  });

  it("enables save once a field is dirty, then creates the profile", async () => {
    getProfileFreshMock.mockResolvedValue(null);
    createProfileMock.mockResolvedValue(sampleProfile);
    renderEditor();

    const save = await screen.findByRole("button", { name: "Save changes" });
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
      expect(createProfileMock).toHaveBeenCalledWith("tok", {
        title: sampleProfile.title,
        headline: sampleProfile.headline,
        subtitle: sampleProfile.subtitle,
      })
    );
    expect(await screen.findByText("Saved")).toBeInTheDocument();
  });

  it("logs out when saving 401s and the token can't be refreshed", async () => {
    getProfileFreshMock.mockResolvedValue(sampleProfile);
    updateProfileMock.mockRejectedValue(new UnauthorizedError());
    refreshAccessTokenMock.mockResolvedValue(null);
    const onLoggedOut = vi.fn();
    renderEditor({ onLoggedOut });

    await screen.findByText("Delete profile");
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Changed" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

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

    await screen.findByText("Delete profile");
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Changed" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(onTokenRefreshed).toHaveBeenCalledWith("new-tok"));
    expect(updateProfileMock).toHaveBeenNthCalledWith(2, "new-tok", {
      title: "Changed",
      headline: sampleProfile.headline,
      subtitle: sampleProfile.subtitle,
    });
  });

  it("deletes the profile via the confirm modal and hides the delete action again", async () => {
    getProfileFreshMock.mockResolvedValue(sampleProfile);
    deleteProfileMock.mockResolvedValue(undefined);
    renderEditor();

    await screen.findByText("Delete profile");
    fireEvent.click(screen.getByText("Delete profile"));

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "Delete this record?" })
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(deleteProfileMock).toHaveBeenCalledWith("tok"));
    expect(screen.queryByText("Delete profile")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
