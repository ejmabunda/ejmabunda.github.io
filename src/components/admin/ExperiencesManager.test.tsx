import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ExperiencesManager from "./ExperiencesManager";
import {
  createExperience,
  getExperiencesFresh,
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
  };
});

vi.mock("@/lib/skillApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/skillApi")>();
  return { ...actual, getSkillsFresh: vi.fn() };
});

vi.mock("@/lib/authApi", () => ({ refreshAccessToken: vi.fn() }));

const getExperiencesFreshMock = vi.mocked(getExperiencesFresh);
const createExperienceMock = vi.mocked(createExperience);
const getSkillsFreshMock = vi.mocked(getSkillsFresh);
const refreshAccessTokenMock = vi.mocked(refreshAccessToken);

const sampleSkills = [
  { id: "s1", name: "C#", skillCategory: "LanguagesAndBackend" as const },
  { id: "s2", name: "Git", skillCategory: "CloudAndDevOps" as const },
];

const sampleExperiences = [
  {
    id: "e1",
    jobTitle: "Software Developer",
    employer: "Xiquel",
    startDate: "2026-02-02T00:00:00",
    endDate: null,
    description: "Backend work",
    skills: [sampleSkills[0]],
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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ExperiencesManager", () => {
  it("lists existing experiences once loaded", async () => {
    getExperiencesFreshMock.mockResolvedValue(sampleExperiences);
    getSkillsFreshMock.mockResolvedValue(sampleSkills);
    renderManager();

    expect(await screen.findByText("Software Developer")).toBeInTheDocument();
    expect(screen.getByText(/Xiquel · 2026-02 – Present/)).toBeInTheDocument();
  });

  it("shows an error state when loading fails", async () => {
    getExperiencesFreshMock.mockRejectedValue(new Error("network"));
    getSkillsFreshMock.mockResolvedValue(sampleSkills);
    renderManager();

    expect(
      await screen.findByText(/something went wrong loading your experience/i)
    ).toBeInTheDocument();
  });

  it("creates an experience, joining description lines and sending selected skill ids", async () => {
    getExperiencesFreshMock.mockResolvedValue([]);
    getSkillsFreshMock.mockResolvedValue(sampleSkills);
    createExperienceMock.mockResolvedValue(sampleExperiences[0]);
    renderManager();

    await screen.findByText("No experience entries yet.");

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
      target: { value: "  Backend work \n\n Built a scheduler " },
    });
    fireEvent.click(screen.getByLabelText("C#"));

    fireEvent.click(screen.getByRole("button", { name: "Add experience" }));

    await waitFor(() =>
      expect(createExperienceMock).toHaveBeenCalledWith("tok", {
        jobTitle: "Software Developer",
        employer: "Xiquel",
        startDate: "2026-02-02",
        endDate: null,
        description: "Backend work\nBuilt a scheduler",
        skillIds: ["s1"],
      })
    );
  });

  it("keeps the submit button disabled until the required fields are filled", async () => {
    getExperiencesFreshMock.mockResolvedValue([]);
    getSkillsFreshMock.mockResolvedValue(sampleSkills);
    renderManager();

    await screen.findByText("No experience entries yet.");
    const submit = screen.getByRole("button", { name: "Add experience" });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Job title"), {
      target: { value: "Dev" },
    });
    fireEvent.change(screen.getByLabelText("Employer"), {
      target: { value: "Xiquel" },
    });
    fireEvent.change(screen.getByLabelText("Start date"), {
      target: { value: "2026-02-02" },
    });
    fireEvent.change(screen.getByLabelText(/Description/), {
      target: { value: "Did things" },
    });
    expect(submit).toBeEnabled();
  });

  it("refreshes the token on a 401 and retries the create", async () => {
    getExperiencesFreshMock.mockResolvedValue([]);
    getSkillsFreshMock.mockResolvedValue(sampleSkills);
    createExperienceMock
      .mockRejectedValueOnce(new UnauthorizedError())
      .mockResolvedValueOnce(sampleExperiences[0]);
    refreshAccessTokenMock.mockResolvedValue("new-tok");
    const onTokenRefreshed = vi.fn();
    renderManager({ onTokenRefreshed });

    await screen.findByText("No experience entries yet.");
    fireEvent.change(screen.getByLabelText("Job title"), {
      target: { value: "Dev" },
    });
    fireEvent.change(screen.getByLabelText("Employer"), {
      target: { value: "Xiquel" },
    });
    fireEvent.change(screen.getByLabelText("Start date"), {
      target: { value: "2026-02-02" },
    });
    fireEvent.change(screen.getByLabelText(/Description/), {
      target: { value: "Did things" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add experience" }));

    await waitFor(() =>
      expect(screen.getByText("Software Developer")).toBeInTheDocument()
    );
    expect(onTokenRefreshed).toHaveBeenCalledWith("new-tok");
    expect(createExperienceMock).toHaveBeenNthCalledWith(
      2,
      "new-tok",
      expect.objectContaining({ jobTitle: "Dev" })
    );
  });
});
