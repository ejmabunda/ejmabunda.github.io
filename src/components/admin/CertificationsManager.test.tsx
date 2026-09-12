import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CertificationsManager from "./CertificationsManager";
import {
  createCertification,
  deleteCertification,
  getCertificationsFresh,
  updateCertification,
  UnauthorizedError,
} from "@/lib/certificationApi";
import { getSkillsFresh } from "@/lib/skillApi";
import { refreshAccessToken } from "@/lib/authApi";

vi.mock("@/lib/certificationApi", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/certificationApi")>();
  return {
    ...actual,
    getCertificationsFresh: vi.fn(),
    createCertification: vi.fn(),
    updateCertification: vi.fn(),
    deleteCertification: vi.fn(),
  };
});

vi.mock("@/lib/skillApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/skillApi")>();
  return { ...actual, getSkillsFresh: vi.fn() };
});

vi.mock("@/lib/authApi", () => ({ refreshAccessToken: vi.fn() }));

const getCertificationsFreshMock = vi.mocked(getCertificationsFresh);
const createCertificationMock = vi.mocked(createCertification);
const updateCertificationMock = vi.mocked(updateCertification);
const deleteCertificationMock = vi.mocked(deleteCertification);
const getSkillsFreshMock = vi.mocked(getSkillsFresh);
const refreshAccessTokenMock = vi.mocked(refreshAccessToken);

const skills = [
  { id: "s1", name: "Azure", skillCategory: "CloudAndDevOps" as const },
];

const certs = [
  {
    id: "c1",
    name: "AZ-204",
    issuingOrganization: "Microsoft",
    issueDate: "2024-05-01T00:00:00",
    url: "https://learn.microsoft.com/credentials/az-204",
    skills: [skills[0]],
  },
];

function renderManager(
  overrides: Partial<React.ComponentProps<typeof CertificationsManager>> = {}
) {
  return render(
    <CertificationsManager
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

describe("CertificationsManager", () => {
  it("loads the list and reports the count", async () => {
    getCertificationsFreshMock.mockResolvedValue(certs);
    getSkillsFreshMock.mockResolvedValue(skills);
    const onCountChange = vi.fn();
    renderManager({ onCountChange });

    // The list row is a button; the auto-selected editor's duplicate title
    // isn't, so this stays unambiguous even once it's pre-loaded.
    expect(
      await screen.findByRole("button", { name: /AZ-204/ })
    ).toBeInTheDocument();
    expect(onCountChange).toHaveBeenLastCalledWith(1);
  });

  it("creates a certification with its skill links", async () => {
    getCertificationsFreshMock.mockResolvedValue([]);
    getSkillsFreshMock.mockResolvedValue(skills);
    createCertificationMock.mockResolvedValue(certs[0]);
    renderManager();

    await screen.findByText("Add a certification");
    fireEvent.change(screen.getByLabelText("name"), {
      target: { value: "AZ-204" },
    });
    fireEvent.change(screen.getByLabelText("issuingOrganization"), {
      target: { value: "Microsoft" },
    });
    fireEvent.change(screen.getByLabelText("issueDate"), {
      target: { value: "2024-05-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Azure" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Save changes" })[0]);

    await waitFor(() =>
      expect(createCertificationMock).toHaveBeenCalledWith(
        "tok",
        expect.objectContaining({
          name: "AZ-204",
          issuingOrganization: "Microsoft",
          issueDate: "2024-05-01",
          skillIds: ["s1"],
        })
      )
    );
  });

  it("deletes the selected certification through the confirm modal", async () => {
    getCertificationsFreshMock.mockResolvedValue(certs);
    getSkillsFreshMock.mockResolvedValue(skills);
    deleteCertificationMock.mockResolvedValue(undefined);
    renderManager();

    fireEvent.click(await screen.findByRole("button", { name: /AZ-204/ }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() =>
      expect(deleteCertificationMock).toHaveBeenCalledWith("tok", "c1")
    );
  });

  it("refreshes the token on a 401 and retries the update", async () => {
    getCertificationsFreshMock.mockResolvedValue(certs);
    getSkillsFreshMock.mockResolvedValue(skills);
    updateCertificationMock
      .mockRejectedValueOnce(new UnauthorizedError())
      .mockResolvedValueOnce(certs[0]);
    refreshAccessTokenMock.mockResolvedValue("new-tok");
    const onTokenRefreshed = vi.fn();
    renderManager({ onTokenRefreshed });

    fireEvent.click(await screen.findByRole("button", { name: /AZ-204/ }));
    fireEvent.change(screen.getByLabelText("name"), {
      target: { value: "AZ-204 (renewed)" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Save changes" })[0]);

    await waitFor(() => expect(onTokenRefreshed).toHaveBeenCalledWith("new-tok"));
  });
});
