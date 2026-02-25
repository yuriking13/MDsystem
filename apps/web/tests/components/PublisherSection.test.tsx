import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PublisherSection from "../../src/components/PublisherSection";

const {
  apiGetProjectPublisherMock,
  apiGetMedSubmissionMock,
  apiCreateMedSubmissionMock,
  apiAssignHandlingEditorMock,
  apiAssignReviewerMock,
  apiSetMedDecisionMock,
  apiPublishMedSubmissionMock,
  apiGrantEditorRoleMock,
} = vi.hoisted(() => ({
  apiGetProjectPublisherMock: vi.fn(),
  apiGetMedSubmissionMock: vi.fn(),
  apiCreateMedSubmissionMock: vi.fn(),
  apiAssignHandlingEditorMock: vi.fn(),
  apiAssignReviewerMock: vi.fn(),
  apiSetMedDecisionMock: vi.fn(),
  apiPublishMedSubmissionMock: vi.fn(),
  apiGrantEditorRoleMock: vi.fn(),
}));

vi.mock("../../src/lib/medPublisherApi", () => ({
  apiGetProjectPublisher: apiGetProjectPublisherMock,
  apiGetMedSubmission: apiGetMedSubmissionMock,
  apiCreateMedSubmission: apiCreateMedSubmissionMock,
  apiAssignHandlingEditor: apiAssignHandlingEditorMock,
  apiAssignReviewer: apiAssignReviewerMock,
  apiSetMedDecision: apiSetMedDecisionMock,
  apiPublishMedSubmission: apiPublishMedSubmissionMock,
  apiGrantEditorRole: apiGrantEditorRoleMock,
  apiSubmitMedSubmission: vi.fn(),
  apiSubmitReview: vi.fn(),
}));

function baseProps() {
  return {
    projectId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    projectName: "Project Name",
    projectDescription: "Project Description for publisher flow.",
    documents: [
      {
        id: "doc-1",
        project_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        title: "Doc title",
        content: "<p>doc content</p>",
        order_index: 0,
        parent_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  };
}

describe("PublisherSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
  });

  it("renders API error message without [object Object]", async () => {
    apiGetProjectPublisherMock.mockRejectedValue(
      new Error("Неизвестная ошибка API"),
    );

    render(<PublisherSection {...baseProps()} />);

    await waitFor(() => {
      expect(screen.getByText("Неизвестная ошибка API")).toBeInTheDocument();
    });
    expect(screen.queryByText("[object Object]")).not.toBeInTheDocument();
  });

  it("validates editor email before enabling assign button", async () => {
    apiGetProjectPublisherMock.mockResolvedValue({
      submissions: [
        {
          id: "sub-1",
          title: "Submission one",
          abstract: "Abstract text",
          keywords: [],
          manuscript: null,
          status: "under_review",
          created_by: "author-id",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          submitted_at: null,
          decision_at: null,
          published_at: null,
          handling_editor_id: "editor-id",
          author_email: "author@example.com",
          handling_editor_email: "editor@example.com",
          reviewers_total: 0,
          reviewers_completed: 0,
        },
      ],
      reviewAssignments: [],
      editorRole: "chief_editor",
      isEditor: true,
    });
    apiGetMedSubmissionMock.mockResolvedValue({
      submission: {
        id: "sub-1",
        title: "Submission one",
        abstract: "Abstract text",
        keywords: [],
        manuscript: null,
        status: "under_review",
        created_by: "author-id",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        submitted_at: null,
        decision_at: null,
        published_at: null,
        handling_editor_id: "editor-id",
        author_email: "author@example.com",
        handling_editor_email: "editor@example.com",
        reviewers_total: 0,
        reviewers_completed: 0,
      },
      reviews: [],
      timeline: [],
      access: { isAuthor: false, isReviewer: false, isEditor: true },
    });

    const user = userEvent.setup();
    render(<PublisherSection {...baseProps()} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Submission one/i }),
      ).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /Submission one/i }));

    const assignEditorButton = screen.getByRole("button", {
      name: "Назначить редактора",
    });
    expect(assignEditorButton).toBeDisabled();

    const inputs = screen.getAllByPlaceholderText(
      /email редактора для назначения|email пользователя/i,
    );
    await user.type(inputs[0], "invalid-email");
    expect(assignEditorButton).toBeDisabled();
    await user.clear(inputs[0]);
    await user.type(inputs[0], "new-editor@example.com");
    expect(assignEditorButton).toBeEnabled();
  });
});
