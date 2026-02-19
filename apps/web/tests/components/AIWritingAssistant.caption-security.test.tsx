import { describe, expect, it, vi } from "vitest";
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
  it("inserts illustration caption as structured text node, not raw HTML", async () => {
    if (!URL.createObjectURL) {
      Object.defineProperty(URL, "createObjectURL", {
        writable: true,
        value: vi.fn(() => "blob:ai-caption-test"),
      });
    } else {
      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:ai-caption-test");
    }

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

    expect(chainApi.insertContent).toHaveBeenCalledWith({
      type: "paragraph",
      content: [{ type: "text", text: maliciousCaption }],
    });

    const hasRawHtmlInsertion = chainApi.insertContent.mock.calls.some(
      ([arg]) => typeof arg === "string",
    );
    expect(hasRawHtmlInsertion).toBe(false);
  });
});
