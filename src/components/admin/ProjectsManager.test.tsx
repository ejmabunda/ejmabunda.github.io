import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProjectsManager from "./ProjectsManager";
import {
  createProject,
  deleteProject,
  getProjectsFresh,
  UnauthorizedError,
  updateProject,
} from "@/lib/projectApi";
import { getSkillsFresh } from "@/lib/skillApi";
import { refreshAccessToken } from "@/lib/authApi";

vi.mock("@/lib/projectApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/projectApi")>();
  return {
    ...actual,
    getProjectsFresh: vi.fn(),
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
  };
});

vi.mock("@/lib/skillApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/skillApi")>();
  return { ...actual, getSkillsFresh: vi.fn() };
});

vi.mock("@/lib/authApi", () => ({ refreshAccessToken: vi.fn() }));

const getProjectsFreshMock = vi.mocked(getProjectsFresh);
const createProjectMock = vi.mocked(createProject);
const updateProjectMock = vi.mocked(updateProject);
const deleteProjectMock = vi.mocked(deleteProject);
const getSkillsFreshMock = vi.mocked(getSkillsFresh);
const refreshAccessTokenMock = vi.mocked(refreshAccessToken);

const skills = [
  { id: "s1", name: "TypeScript", skillCategory: "LanguagesAndBackend" as const },
];

const projects = [
  {
    id: "p1",
    name: "Portfolio site",
    url: "https://ejmabunda.dev",
    skills: [skills[0]],
  },
];

function renderManager(
  overrides: Partial<React.ComponentProps<typeof ProjectsManager>> = {}
) {
  return render(
    <ProjectsManager
      token="tok"
      onTokenRefreshed={vi.fn()}
      onLoggedOut={vi.fn()}
      waking={false}
      onCountChange={vi.fn()}
      {...overrides}
    />
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ProjectsManager", () => {
  it("lists existing projects and reports the count", async () => {
    getProjectsFreshMock.mockResolvedValue(projects);
    getSkillsFreshMock.mockResolvedValue(skills);
    const onCountChange = vi.fn();
    renderManager({ onCountChange });

    expect(await screen.findByText("Portfolio site")).toBeInTheDocument();
    // the url and skill tags render twice — once for desktop columns, once
    // in the mobile stacked view — so scope to "at least one" via getAllBy.
    expect(screen.getAllByText("https://ejmabunda.dev")[0]).toBeInTheDocument();
    expect(onCountChange).toHaveBeenLastCalledWith(1);
  });

  it("shows an empty prompt when there are no projects yet (no controller shipped)", async () => {
    getProjectsFreshMock.mockResolvedValue([]);
    getSkillsFreshMock.mockResolvedValue(skills);
    renderManager();

    expect(await screen.findByText("No records yet.")).toBeInTheDocument();
  });

  it("adds a project with its skill links", async () => {
    getProjectsFreshMock.mockResolvedValue([]);
    getSkillsFreshMock.mockResolvedValue(skills);
    createProjectMock.mockResolvedValue(projects[0]);
    renderManager();

    await screen.findByText("No records yet.");
    fireEvent.click(screen.getByRole("button", { name: "+ Add project" }));
    fireEvent.change(screen.getByPlaceholderText("Project name"), {
      target: { value: "Portfolio site" },
    });
    fireEvent.change(screen.getByPlaceholderText("https://…"), {
      target: { value: "https://ejmabunda.dev" },
    });
    fireEvent.click(screen.getByRole("button", { name: "TypeScript" }));
    fireEvent.click(screen.getByRole("button", { name: "Add project" }));

    await waitFor(() =>
      expect(createProjectMock).toHaveBeenCalledWith("tok", {
        name: "Portfolio site",
        url: "https://ejmabunda.dev",
        skillIds: ["s1"],
      })
    );
  });

  it("edits a project inline", async () => {
    getProjectsFreshMock.mockResolvedValue(projects);
    getSkillsFreshMock.mockResolvedValue(skills);
    updateProjectMock.mockResolvedValue({
      ...projects[0],
      name: "Portfolio site v2",
    });
    renderManager();

    await screen.findByText("Portfolio site");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    const nameInputs = screen.getAllByRole("textbox");
    fireEvent.change(nameInputs[0], {
      target: { value: "Portfolio site v2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(updateProjectMock).toHaveBeenCalledWith(
        "tok",
        "p1",
        expect.objectContaining({ name: "Portfolio site v2" })
      )
    );
  });

  it("deletes a project through the confirmation modal", async () => {
    getProjectsFreshMock.mockResolvedValue(projects);
    getSkillsFreshMock.mockResolvedValue(skills);
    deleteProjectMock.mockResolvedValue(undefined);
    renderManager();

    await screen.findByText("Portfolio site");
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() =>
      expect(deleteProjectMock).toHaveBeenCalledWith("tok", "p1")
    );
  });

  it("refreshes the token on a 401 and retries the write", async () => {
    getProjectsFreshMock.mockResolvedValue([]);
    getSkillsFreshMock.mockResolvedValue(skills);
    createProjectMock
      .mockRejectedValueOnce(new UnauthorizedError())
      .mockResolvedValueOnce(projects[0]);
    refreshAccessTokenMock.mockResolvedValue("new-tok");
    const onTokenRefreshed = vi.fn();
    renderManager({ onTokenRefreshed });

    await screen.findByText("No records yet.");
    fireEvent.click(screen.getByRole("button", { name: "+ Add project" }));
    fireEvent.change(screen.getByPlaceholderText("Project name"), {
      target: { value: "Portfolio site" },
    });
    fireEvent.change(screen.getByPlaceholderText("https://…"), {
      target: { value: "https://ejmabunda.dev" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add project" }));

    await waitFor(() => expect(onTokenRefreshed).toHaveBeenCalledWith("new-tok"));
    expect(createProjectMock).toHaveBeenNthCalledWith(
      2,
      "new-tok",
      expect.objectContaining({ name: "Portfolio site" })
    );
  });
});
