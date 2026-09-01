import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SkillsManager from "./SkillsManager";
import {
  createSkill,
  deleteSkill,
  getSkillsFresh,
  updateSkill,
  UnauthorizedError,
} from "@/lib/skillApi";
import { refreshAccessToken } from "@/lib/authApi";

vi.mock("@/lib/skillApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/skillApi")>();
  return {
    ...actual,
    getSkillsFresh: vi.fn(),
    createSkill: vi.fn(),
    updateSkill: vi.fn(),
    deleteSkill: vi.fn(),
  };
});

vi.mock("@/lib/authApi", () => ({
  refreshAccessToken: vi.fn(),
}));

const getSkillsFreshMock = vi.mocked(getSkillsFresh);
const createSkillMock = vi.mocked(createSkill);
const updateSkillMock = vi.mocked(updateSkill);
const deleteSkillMock = vi.mocked(deleteSkill);
const refreshAccessTokenMock = vi.mocked(refreshAccessToken);

const sample = [
  { id: "1", name: "C#", skillCategory: "LanguagesAndBackend" as const },
  { id: "2", name: "GitHub", skillCategory: "Platform" as const },
];

function renderManager(overrides: Partial<React.ComponentProps<typeof SkillsManager>> = {}) {
  return render(
    <SkillsManager
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

describe("SkillsManager", () => {
  it("lists existing skills once loaded", async () => {
    getSkillsFreshMock.mockResolvedValue(sample);
    renderManager();

    expect(await screen.findByText("C#")).toBeInTheDocument();
    expect(screen.getByText("GitHub")).toBeInTheDocument();
  });

  it("shows an error state when the list fails to load", async () => {
    getSkillsFreshMock.mockRejectedValue(new Error("network"));
    renderManager();

    expect(
      await screen.findByText(/something went wrong fetching your skills/i)
    ).toBeInTheDocument();
  });

  it("shows an empty prompt when there are no skills", async () => {
    getSkillsFreshMock.mockResolvedValue([]);
    renderManager();

    expect(await screen.findByText(/no skills yet/i)).toBeInTheDocument();
  });

  it("creates a skill, sending the category as its integer", async () => {
    getSkillsFreshMock.mockResolvedValue([]);
    createSkillMock.mockResolvedValue({
      id: "9",
      name: "Docker",
      skillCategory: "CloudAndDevOps",
    });
    renderManager();

    await screen.findByText(/no skills yet/i);
    fireEvent.change(screen.getByLabelText("New skill name"), {
      target: { value: "Docker" },
    });
    fireEvent.change(screen.getByLabelText("New skill category"), {
      target: { value: "CloudAndDevOps" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add skill" }));

    await waitFor(() => expect(screen.getByText("Docker")).toBeInTheDocument());
    expect(createSkillMock).toHaveBeenCalledWith("tok", {
      name: "Docker",
      skillCategory: 4,
    });
  });

  it("edits a skill inline", async () => {
    getSkillsFreshMock.mockResolvedValue(sample);
    updateSkillMock.mockResolvedValue({
      id: "1",
      name: "C# / .NET",
      skillCategory: "LanguagesAndBackend",
    });
    renderManager();

    await screen.findByText("C#");
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    fireEvent.change(screen.getByLabelText("Rename C#"), {
      target: { value: "C# / .NET" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(screen.getByText("C# / .NET")).toBeInTheDocument()
    );
    expect(updateSkillMock).toHaveBeenCalledWith("tok", {
      id: "1",
      name: "C# / .NET",
      skillCategory: 0,
    });
  });

  it("deletes a skill through the confirmation modal", async () => {
    getSkillsFreshMock.mockResolvedValue(sample);
    deleteSkillMock.mockResolvedValue(undefined);
    renderManager();

    await screen.findByText("GitHub");
    fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[1]);
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: 'Delete "GitHub"?' })
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() =>
      expect(deleteSkillMock).toHaveBeenCalledWith("tok", "2")
    );
    await waitFor(() =>
      expect(screen.queryByText("GitHub")).not.toBeInTheDocument()
    );
  });

  it("refreshes the token on a 401 and retries the write", async () => {
    getSkillsFreshMock.mockResolvedValue([]);
    createSkillMock
      .mockRejectedValueOnce(new UnauthorizedError())
      .mockResolvedValueOnce({
        id: "9",
        name: "Docker",
        skillCategory: "CloudAndDevOps",
      });
    refreshAccessTokenMock.mockResolvedValue("new-tok");
    const onTokenRefreshed = vi.fn();
    renderManager({ onTokenRefreshed });

    await screen.findByText(/no skills yet/i);
    fireEvent.change(screen.getByLabelText("New skill name"), {
      target: { value: "Docker" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add skill" }));

    await waitFor(() => expect(screen.getByText("Docker")).toBeInTheDocument());
    expect(onTokenRefreshed).toHaveBeenCalledWith("new-tok");
    expect(createSkillMock).toHaveBeenNthCalledWith(2, "new-tok", {
      name: "Docker",
      skillCategory: 0,
    });
  });

  it("logs out when a write 401s and the token can't be refreshed", async () => {
    getSkillsFreshMock.mockResolvedValue([]);
    createSkillMock.mockRejectedValue(new UnauthorizedError());
    refreshAccessTokenMock.mockResolvedValue(null);
    const onLoggedOut = vi.fn();
    renderManager({ onLoggedOut });

    await screen.findByText(/no skills yet/i);
    fireEvent.change(screen.getByLabelText("New skill name"), {
      target: { value: "Docker" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add skill" }));

    await waitFor(() => expect(onLoggedOut).toHaveBeenCalledTimes(1));
  });
});
