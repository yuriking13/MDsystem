import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Editor } from "@tiptap/react";
import AIWritingAssistant from "../../src/components/TiptapEditor/AIWritingAssistant";

const { apiAIGenerateIllustrationMock } = vi.hoisted(() => ({
  apiAIGenerateIllustrationMock: vi.fn(),
}));

vi.mock("../../src/lib/api", () => ({
  apiAIImproveText: vi.fn(),
  apiAIGenerateTable: vi.fn(),
  apiAIGenerateIllustration: apiAIGenerateIllustrationMock,
}));

function createEditorMock(): {
  editor: Editor;
  chainApi: {
    focus: ReturnType<typeof vi.fn>;
    deleteRange: ReturnType<typeof vi.fn>;
    insertContentAt: ReturnType<typeof vi.fn>;
    setImage: ReturnType<typeof vi.fn>;
    insertContent: ReturnType<typeof vi.fn>;
    run: ReturnType<typeof vi.fn>;
  };
} {
  const textBetweenMock = vi.fn(() => "selected text");

  const chainApi = {
    focus: vi.fn(),
    deleteRange: vi.fn(),
    insertContentAt: vi.fn(),
    setImage: vi.fn(),
    insertContent: vi.fn(),
    run: vi.fn(() => true),
  };

  chainApi.focus.mockReturnValue(chainApi);
  chainApi.deleteRange.mockReturnValue(chainApi);
  chainApi.insertContentAt.mockReturnValue(chainApi);
  chainApi.setImage.mockReturnValue(chainApi);
  chainApi.insertContent.mockReturnValue(chainApi);

  const editor = {
    state: {
      selection: { from: 10, to: 20 },
      doc: {
        textBetween: textBetweenMock,
        content: { size: 2000 },
      },
    },
    chain: vi.fn(() => chainApi),
  } as unknown as Editor;

  return { editor, chainApi };
}

describe("AIWritingAssistant caption insertion security", () => {
  beforeEach(() => {
    apiAIGenerateIllustrationMock.mockReset();
  });

  it("inserts persisted illustration as project file node", async () => {
    const maliciousCaption = `Caption <img src=x onerror=alert("xss")> <script>alert("x")</script>`;

    apiAIGenerateIllustrationMock.mockResolvedValue({
      ok: true,
      title: "Test illustration",
      description: "Test",
      type: "diagram",
      svgCode:
        '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10" /></svg>',
      figureCaption: maliciousCaption,
      notes: null,
      projectFile: {
        id: "file-illustration-1",
        name: "ai-illustration.svg",
        mimeType: "image/svg+xml",
        category: "image",
      },
    });

    const { editor, chainApi } = createEditorMock();
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <AIWritingAssistant
        editor={editor}
        projectId="project-1"
        onClose={onClose}
      />,
    );

    await user.click(screen.getByText("Создать иллюстрацию"));
    await user.click(screen.getByText("Сгенерировать иллюстрацию"));

    await waitFor(() => {
      expect(apiAIGenerateIllustrationMock).toHaveBeenCalled();
      expect(screen.getByText("Вставить в документ")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Вставить в документ"));

    expect(chainApi.insertContent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "projectFileNode",
        attrs: expect.objectContaining({
          fileId: "file-illustration-1",
          projectId: "project-1",
          caption: maliciousCaption,
        }),
      }),
    );

    const hasRawHtmlInsertion = chainApi.insertContent.mock.calls.some(
      ([arg]) => typeof arg === "string",
    );
    expect(hasRawHtmlInsertion).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows graceful error when persisted asset is missing", async () => {
    apiAIGenerateIllustrationMock.mockResolvedValue({
      ok: true,
      title: "Test illustration",
      description: "Test",
      type: "diagram",
      svgCode:
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="10" height="10" /></svg>',
      figureCaption: "Safe caption",
      notes: null,
    });

    const { editor, chainApi } = createEditorMock();
    const onClose = vi.fn();
    const user = userEvent.setup();

    const { container } = render(
      <AIWritingAssistant
        editor={editor}
        projectId="project-1"
        onClose={onClose}
      />,
    );

    await user.click(screen.getByText("Создать иллюстрацию"));
    await user.click(screen.getByText("Сгенерировать иллюстрацию"));

    await waitFor(() => {
      expect(screen.getByText("Вставить в документ")).toBeInTheDocument();
    });

    expect(container.querySelector(".ai-illustration-preview script")).toBeNull();

    await user.click(screen.getByText("Вставить в документ"));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Иллюстрация не была сохранена в хранилище. Попробуйте сгенерировать заново.",
        ),
      ).toBeInTheDocument();
    });

    expect(chainApi.insertContent).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "projectFileNode" }),
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});
