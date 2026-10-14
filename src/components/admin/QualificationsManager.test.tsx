import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import QualificationsManager from "./QualificationsManager";
import {
  ApiError,
  createQualification,
  deleteQualification,
  getQualificationsFresh,
  updateQualification,
  UnauthorizedError,
} from "@/lib/qualificationApi";
import { getSkillsFresh } from "@/lib/skillApi";
import { refreshAccessToken } from "@/lib/authApi";

vi.mock("@/lib/qualificationApi", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/qualificationApi")>();
  return {
    ...actual,
    getQualificationsFresh: vi.fn(),
    createQualification: vi.fn(),
    updateQualification: vi.fn(),
    deleteQualification: vi.fn(),
  };
});

vi.mock("@/lib/skillApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/skillApi")>();
  return { ...actual, getSkillsFresh: vi.fn() };
});

vi.mock("@/lib/authApi", () => ({ refreshAccessToken: vi.fn() }));

const getQualificationsFreshMock = vi.mocked(getQualificationsFresh);
const createQualificationMock = vi.mocked(createQualification);
const updateQualificationMock = vi.mocked(updateQualification);
const deleteQualificationMock = vi.mocked(deleteQualification);
const getSkillsFreshMock = vi.mocked(getSkillsFresh);
const refreshAccessTokenMock = vi.mocked(refreshAccessToken);

const skills = [
  { id: "s1", name: "C#", skillCategory: "LanguagesAndBackend" as const },
];

const quals = [
  {
    id: "q1",
    name: "BSc Computer Science",
    institution: "University of Johannesburg",
    startDate: "2020-01-01T00:00:00",
    endDate: "2022-12-01T00:00:00",
    nqfLevel: "BachelorsDegree" as const,
    skills: [skills[0]],
  },
];

function fillRequired(endDate: string | null = "2022-12-01") {
  fireEvent.change(screen.getByLabelText("name"), {
    target: { value: "BSc" },
  });
  fireEvent.change(screen.getByLabelText("institution"), {
    target: { value: "UJ" },
  });
  fireEvent.change(screen.getByLabelText("startDate"), {
    target: { value: "2020-01-01" },
  });
  if (endDate !== null) {
    fireEvent.change(screen.getByLabelText("endDate"), {
      target: { value: endDate },
    });
  }
}

const save = () =>
  fireEvent.click(screen.getAllByRole("button", { name: "Save changes" })[0]);

function renderManager(
  overrides: Partial<React.ComponentProps<typeof QualificationsManager>> = {}
) {
  return render(
    <QualificationsManager
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

describe("QualificationsManager", () => {
  it("loads the list and reports the count", async () => {
    getQualificationsFreshMock.mockResolvedValue(quals);
    getSkillsFreshMock.mockResolvedValue(skills);
    const onCountChange = vi.fn();
    renderManager({ onCountChange });

    // The list row is a button; the auto-selected editor's duplicate title
    // isn't, so this stays unambiguous even once it's pre-loaded.
    expect(
      await screen.findByRole("button", { name: /BSc Computer Science/ })
    ).toBeInTheDocument();
    expect(onCountChange).toHaveBeenLastCalledWith(1);
  });

  it("shows an error state with a retry when loading fails", async () => {
    getQualificationsFreshMock.mockRejectedValue(new Error("network"));
    getSkillsFreshMock.mockResolvedValue(skills);
    renderManager();

    expect(
      await screen.findByText(/this isn.t available right now/i)
    ).toBeInTheDocument();
  });

  it("creates a qualification, sending nqfLevel as an int", async () => {
    getQualificationsFreshMock.mockResolvedValue([]);
    getSkillsFreshMock.mockResolvedValue(skills);
    createQualificationMock.mockResolvedValue(quals[0]);
    renderManager();

    await screen.findByText("Add a qualification");
    fireEvent.change(screen.getByLabelText("name"), {
      target: { value: "BSc Computer Science" },
    });
    fireEvent.change(screen.getByLabelText("institution"), {
      target: { value: "University of Johannesburg" },
    });
    fireEvent.change(screen.getByLabelText("startDate"), {
      target: { value: "2020-01-01" },
    });
    fireEvent.change(screen.getByLabelText("endDate"), {
      target: { value: "2022-12-01" },
    });
    fireEvent.change(screen.getByLabelText(/nqfLevel/), {
      target: { value: "HonoursDegree" },
    });
    fireEvent.click(screen.getByRole("button", { name: "C#" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Save changes" })[0]);

    await waitFor(() =>
      expect(createQualificationMock).toHaveBeenCalledWith(
        "tok",
        expect.objectContaining({ nqfLevel: 8, skillIds: ["s1"] })
      )
    );
  });

  it("sends endDate: null when In progress is checked", async () => {
    getQualificationsFreshMock.mockResolvedValue([]);
    getSkillsFreshMock.mockResolvedValue(skills);
    createQualificationMock.mockResolvedValue(quals[0]);
    renderManager();

    await screen.findByText("Add a qualification");
    fireEvent.change(screen.getByLabelText("name"), {
      target: { value: "BSc" },
    });
    fireEvent.change(screen.getByLabelText("institution"), {
      target: { value: "UJ" },
    });
    fireEvent.change(screen.getByLabelText("startDate"), {
      target: { value: "2020-01-01" },
    });
    fireEvent.click(screen.getByLabelText(/In progress/));
    fireEvent.click(screen.getAllByRole("button", { name: "Save changes" })[0]);

    await waitFor(() =>
      expect(createQualificationMock).toHaveBeenCalledWith(
        "tok",
        expect.objectContaining({ endDate: null })
      )
    );
  });

  it("loads a qualification into the editor and saves an update", async () => {
    getQualificationsFreshMock.mockResolvedValue(quals);
    getSkillsFreshMock.mockResolvedValue(skills);
    updateQualificationMock.mockResolvedValue({
      ...quals[0],
      name: "BSc Computer Science (Hons)",
    });
    renderManager();

    fireEvent.click(
      await screen.findByRole("button", { name: /BSc Computer Science/ })
    );
    fireEvent.change(screen.getByLabelText("name"), {
      target: { value: "BSc Computer Science (Hons)" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Save changes" })[0]);

    await waitFor(() =>
      expect(updateQualificationMock).toHaveBeenCalledWith(
        "tok",
        "q1",
        expect.objectContaining({ name: "BSc Computer Science (Hons)" })
      )
    );
  });

  it("deletes the selected qualification through the confirm modal", async () => {
    getQualificationsFreshMock.mockResolvedValue(quals);
    getSkillsFreshMock.mockResolvedValue(skills);
    deleteQualificationMock.mockResolvedValue(undefined);
    renderManager();

    fireEvent.click(
      await screen.findByRole("button", { name: /BSc Computer Science/ })
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() =>
      expect(deleteQualificationMock).toHaveBeenCalledWith("tok", "q1")
    );
  });

  it("refreshes the token on a 401 and retries the create", async () => {
    getQualificationsFreshMock.mockResolvedValue([]);
    getSkillsFreshMock.mockResolvedValue(skills);
    createQualificationMock
      .mockRejectedValueOnce(new UnauthorizedError())
      .mockResolvedValueOnce(quals[0]);
    refreshAccessTokenMock.mockResolvedValue("new-tok");
    const onTokenRefreshed = vi.fn();
    renderManager({ onTokenRefreshed });

    await screen.findByText("Add a qualification");
    fillRequired();
    save();

    await waitFor(() => expect(onTokenRefreshed).toHaveBeenCalledWith("new-tok"));
    expect(createQualificationMock).toHaveBeenCalledTimes(2);
    expect(createQualificationMock).toHaveBeenLastCalledWith(
      "new-tok",
      expect.anything()
    );
  });

  it("lists newest first, labels the NQF level, and collapses a same-month period", async () => {
    getQualificationsFreshMock.mockResolvedValue([
      {
        id: "nsc",
        name: "National Senior Certificate",
        institution: "Ponelopele Oracle Secondary School",
        startDate: "2017-12-01T00:00:00",
        endDate: "2017-12-01T00:00:00",
        nqfLevel: "Grade12",
        skills: [],
      },
      ...quals,
    ]);
    getSkillsFreshMock.mockResolvedValue(skills);
    const { container } = renderManager();

    await screen.findByRole("button", { name: /National Senior Certificate/ });
    const rows = [...container.querySelectorAll(".admin-list-row .l-title")].map(
      (el) => el.textContent
    );
    expect(rows).toEqual(["BSc Computer Science", "National Senior Certificate"]);
    expect(screen.getByText("Dec 2017")).toBeInTheDocument();
    expect(screen.getByText("Jan 2020 — Dec 2022")).toBeInTheDocument();
    expect(screen.getByText("NQF 4")).toBeInTheDocument();
  });

  it("an update always resends endDate and the full skill list", async () => {
    getQualificationsFreshMock.mockResolvedValue(quals);
    getSkillsFreshMock.mockResolvedValue(skills);
    updateQualificationMock.mockResolvedValue({ ...quals[0], name: "BSc CS" });
    renderManager();

    await screen.findByRole("button", { name: /BSc Computer Science/ });
    fireEvent.change(screen.getByLabelText("name"), {
      target: { value: "BSc CS" },
    });
    save();

    await waitFor(() =>
      expect(updateQualificationMock).toHaveBeenCalledWith("tok", "q1", {
        name: "BSc CS",
        institution: "University of Johannesburg",
        startDate: "2020-01-01",
        endDate: "2022-12-01",
        nqfLevel: 7,
        skillIds: ["s1"],
      })
    );
  });

  it("sends skillIds: [] when every skill is unpicked", async () => {
    getQualificationsFreshMock.mockResolvedValue(quals);
    getSkillsFreshMock.mockResolvedValue(skills);
    updateQualificationMock.mockResolvedValue({ ...quals[0], skills: [] });
    renderManager();

    await screen.findByRole("button", { name: /BSc Computer Science/ });
    fireEvent.click(screen.getByRole("button", { name: "C#" }));
    save();

    await waitFor(() =>
      expect(updateQualificationMock).toHaveBeenCalledWith(
        "tok",
        "q1",
        expect.objectContaining({ skillIds: [] })
      )
    );
  });

  it("shows the backend's message when a save is rejected", async () => {
    getQualificationsFreshMock.mockResolvedValue([]);
    getSkillsFreshMock.mockResolvedValue(skills);
    createQualificationMock.mockRejectedValue(
      new ApiError(400, "One or more skill ids do not exist.")
    );
    renderManager();

    await screen.findByText("Add a qualification");
    fillRequired();
    save();

    expect(
      await screen.findByText("One or more skill ids do not exist.")
    ).toBeInTheDocument();
  });

  it("falls back to generic copy when the rejection has no message", async () => {
    getQualificationsFreshMock.mockResolvedValue([]);
    getSkillsFreshMock.mockResolvedValue(skills);
    createQualificationMock.mockRejectedValue(new ApiError(500, ""));
    renderManager();

    await screen.findByText("Add a qualification");
    fillRequired();
    save();

    expect(
      await screen.findByText("Couldn't add that qualification. Try again.")
    ).toBeInTheDocument();
  });

  it("blocks an end date before the start date", async () => {
    getQualificationsFreshMock.mockResolvedValue([]);
    getSkillsFreshMock.mockResolvedValue(skills);
    renderManager();

    await screen.findByText("Add a qualification");
    fillRequired("2019-06-01");
    // Bypass the input's native `min` constraint, which already stops the
    // submit button in a real browser, to exercise the guard behind it.
    fireEvent.submit(document.getElementById("admin-qual-form")!);

    expect(
      await screen.findByText("The end date can't be before the start date.")
    ).toBeInTheDocument();
    expect(createQualificationMock).not.toHaveBeenCalled();
  });

  it("requires an end date unless the qualification is in progress", async () => {
    getQualificationsFreshMock.mockResolvedValue([]);
    getSkillsFreshMock.mockResolvedValue(skills);
    renderManager();

    await screen.findByText("Add a qualification");
    fillRequired(null);
    save();

    expect(
      await screen.findByText("Add an end date, or mark it as in progress.")
    ).toBeInTheDocument();
    expect(createQualificationMock).not.toHaveBeenCalled();
  });
});
