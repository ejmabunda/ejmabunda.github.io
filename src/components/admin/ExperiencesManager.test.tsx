import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ExperiencesManager from "./ExperiencesManager";
import {
  createExperience,
  deleteExperience,
  getExperiencesFresh,
  updateExperience,
  UnauthorizedError,
} from "@/lib/experienceApi";
import { getSkillsFresh } from "@/lib/skillApi";
import { refreshAccessToken } from "@/lib/authApi";

vi.mock("@/lib/experienceApi", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/experienceApi")>();
  return {
    ...actual,
    getExperiencesFresh: vi.fn(),
    createExperience: vi.fn(),
    updateExperience: vi.fn(),
    deleteExperience: vi.fn(),
  };
});

vi.mock("@/lib/skillApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/skillApi")>();
  return { ...actual, getSkillsFresh: vi.fn() };
});

vi.mock("@/lib/authApi", () => ({ refreshAccessToken: vi.fn() }));

const getExperiencesFreshMock = vi.mocked(getExperiencesFresh);
const createExperienceMock = vi.mocked(createExperience);
const updateExperienceMock = vi.mocked(updateExperience);
const deleteExperienceMock = vi.mocked(deleteExperience);
const getSkillsFreshMock = vi.mocked(getSkillsFresh);
const refreshAccessTokenMock = vi.mocked(refreshAccessToken);

const skills = [
  { id: "s1", name: "C#", skillCategory: "LanguagesAndBackend" as const },
  { id: "s2", name: "Git", skillCategory: "CloudAndDevOps" as const },
];

const roles = [
  {
    id: "e1",
    jobTitle: "Junior Developer",
    employer: "Xiquel Group",
    startDate: "2026-02-02T00:00:00",
    endDate: "2027-01-31T00:00:00",
    description: "Backend work\nAutomated tests",
    skills: [skills[0]],
  },
  {
    id: "e2",
    jobTitle: "IT Support Assistant",
    employer: "Northlink College",
    startDate: "2023-08-01T00:00:00",
    endDate: "2024-05-01T00:00:00",
    description: "First-line support",
    skills: [],
  },
];

function renderManager(
  overrides: Partial<React.ComponentProps<typeof ExperiencesManager>> = {}
) {
  return render(
    <ExperiencesManager
      token="tok"
      onTokenRefreshed={vi.fn()}
      onLoggedOut={vi.fn()}
      {...overrides}
    />
  );
}

function fillNewRole() {
  fireEvent.change(screen.getByLabelText("Job title"), {
    target: { value: "Software Developer" },
  });
  fireEvent.change(screen.getByLabelText("Employer"), {
    target: { value: "Xiquel" },
  });
  fireEvent.change(screen.getByLabelText("Start date"), {
    target: { value: "2026-02-02" },
  });
  fireEvent.change(screen.getByLabelText(/Description/), {
    target: { value: "  Did things \n\n Shipped stuff " },
  });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ExperiencesManager", () => {
  it("loads the timeline and reports the role count", async () => {
    getExperiencesFreshMock.mockResolvedValue(roles);
    getSkillsFreshMock.mockResolvedValue(skills);
    const onCountChange = vi.fn();
    renderManager({ onCountChange });

    expect(await screen.findByText("Junior Developer")).toBeInTheDocument();
    expect(screen.getByText("IT Support Assistant")).toBeInTheDocument();
    expect(onCountChange).toHaveBeenLastCalledWith(2);
    expect(screen.getByText("TIMELINE · 2")).toBeInTheDocument();
  });

  it("shows an error state when loading fails", async () => {
    getExperiencesFreshMock.mockRejectedValue(new Error("network"));
    getSkillsFreshMock.mockResolvedValue(skills);
    renderManager();

    expect(
      await screen.findByText(/something went wrong loading your experience/i)
    ).toBeInTheDocument();
  });

  it("creates a role, joining bullets and sending the picked skill ids", async () => {
    getExperiencesFreshMock.mockResolvedValue([]);
    getSkillsFreshMock.mockResolvedValue(skills);
    createExperienceMock.mockResolvedValue(roles[0]);
    renderManager();

    await screen.findByText("Add a role");
    fillNewRole();
    fireEvent.click(screen.getByRole("button", { name: "C#" }));
    fireEvent.click(
      screen.getAllByRole("button", { name: "Add experience" })[0]
    );

    await waitFor(() =>
      expect(createExperienceMock).toHaveBeenCalledWith("tok", {
        jobTitle: "Software Developer",
        employer: "Xiquel",
        startDate: "2026-02-02",
        endDate: null,
        description: "Did things\nShipped stuff",
        skillIds: ["s1"],
      })
    );
  });

  it("loads a role into the editor and saves an update", async () => {
    getExperiencesFreshMock.mockResolvedValue(roles);
    getSkillsFreshMock.mockResolvedValue(skills);
    updateExperienceMock.mockResolvedValue({
      ...roles[0],
      jobTitle: "Mid Developer",
    });
    renderManager();

    await screen.findByText("Junior Developer");
    fireEvent.click(
      screen.getByText("Junior Developer").closest("button")!
    );

    expect(screen.getByText("Edit role")).toBeInTheDocument();
    expect(screen.getByLabelText("Job title")).toHaveValue("Junior Developer");

    fireEvent.change(screen.getByLabelText("Job title"), {
      target: { value: "Mid Developer" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Save role" })[0]);

    await waitFor(() =>
      expect(updateExperienceMock).toHaveBeenCalledWith(
        "tok",
        "e1",
        expect.objectContaining({ jobTitle: "Mid Developer", skillIds: ["s1"] })
      )
    );
  });

  it("deletes the selected role through the confirm modal", async () => {
    getExperiencesFreshMock.mockResolvedValue(roles);
    getSkillsFreshMock.mockResolvedValue(skills);
    deleteExperienceMock.mockResolvedValue(undefined);
    renderManager();

    await screen.findByText("Junior Developer");
    fireEvent.click(screen.getByText("Junior Developer").closest("button")!);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() =>
      expect(deleteExperienceMock).toHaveBeenCalledWith("tok", "e1")
    );
    await waitFor(() =>
      expect(screen.queryByText("Junior Developer")).not.toBeInTheDocument()
    );
  });

  it("refreshes the token on a 401 and retries the create", async () => {
    getExperiencesFreshMock.mockResolvedValue([]);
    getSkillsFreshMock.mockResolvedValue(skills);
    createExperienceMock
      .mockRejectedValueOnce(new UnauthorizedError())
      .mockResolvedValueOnce(roles[0]);
    refreshAccessTokenMock.mockResolvedValue("new-tok");
    const onTokenRefreshed = vi.fn();
    renderManager({ onTokenRefreshed });

    await screen.findByText("Add a role");
    fillNewRole();
    fireEvent.click(
      screen.getAllByRole("button", { name: "Add experience" })[0]
    );

    await waitFor(() => expect(onTokenRefreshed).toHaveBeenCalledWith("new-tok"));
    expect(createExperienceMock).toHaveBeenNthCalledWith(
      2,
      "new-tok",
      expect.objectContaining({ jobTitle: "Software Developer" })
    );
  });
});
