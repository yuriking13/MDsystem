import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  queryMock,
  checkProjectAccessPoolMock,
  getUserApiKeyMock,
  uploadFileMock,
  deleteFileMock,
  isStorageConfiguredMock,
  generateStoragePathMock,
  prismaProjectFileCreateMock,
  invalidateFilesMock,
  fetchMock,
} = vi.hoisted(() => ({
  queryMock: vi.fn(),
  checkProjectAccessPoolMock: vi.fn(),
  getUserApiKeyMock: vi.fn(),
  uploadFileMock: vi.fn(),
  deleteFileMock: vi.fn(),
  isStorageConfiguredMock: vi.fn(),
  generateStoragePathMock: vi.fn(),
  prismaProjectFileCreateMock: vi.fn(),
  invalidateFilesMock: vi.fn(),
  fetchMock: vi.fn(),
}));

vi.mock("../../src/pg.js", () => ({
  pool: {
    query: queryMock,
    totalCount: 0,
    idleCount: 0,
    waitingCount: 0,
  },
}));

vi.mock("../../src/utils/project-access.js", () => ({
  checkProjectAccessPool: checkProjectAccessPoolMock,
  getUserApiKey: getUserApiKeyMock,
}));

vi.mock("../../src/plugins/rate-limit.js", () => ({
  rateLimits: {
    ai: async () => undefined,
    api: async () => undefined,
  },
}));

vi.mock("../../src/lib/storage.js", () => ({
  isStorageConfigured: isStorageConfiguredMock,
  generateStoragePath: generateStoragePathMock,
  uploadFile: uploadFileMock,
  deleteFile: deleteFileMock,
}));

vi.mock("../../src/db.js", () => ({
  prisma: {
    projectFile: {
      create: prismaProjectFileCreateMock,
    },
  },
}));

vi.mock("../../src/lib/redis.js", () => ({
  invalidateFiles: invalidateFilesMock,
}));

function setTestEnv(options?: {
  agenticEnabled?: boolean;
  maxCriticRounds?: number;
}) {
  process.env.NODE_ENV = "test";
  process.env.HOST = "127.0.0.1";
  process.env.PORT = "3001";
  process.env.DATABASE_URL =
    "postgresql://test:test@localhost:5432/mdsystem_test";
  process.env.JWT_SECRET = "test-jwt-secret-for-ai-illustration-tests";
  process.env.API_KEY_ENCRYPTION_SECRET =
    "test-api-key-secret-32-characters-ok";
  process.env.CORS_ORIGIN = "http://localhost:5173";
  process.env.CROSSREF_MAILTO = "test@example.com";
  process.env.AI_ILLUSTRATION_AGENTIC_ENABLED = options?.agenticEnabled
    ? "true"
    : "false";
  process.env.AI_ILLUSTRATION_AGENTIC_MAX_CRITIC_ROUNDS = String(
    options?.maxCriticRounds ?? 1,
  );
}

function createOpenRouterResponse(content: string): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content } }],
    }),
    text: async () => content,
  } as unknown as Response;
}

function createValidIllustrationResponse(
  overrides?: Partial<{
    title: string;
    description: string;
    type: "diagram" | "flowchart" | "schema" | "infographic";
    svgCode: string;
    figureCaption: string | null;
    notes: string | null;
  }>,
) {
  return {
    title: overrides?.title || "Neural signaling diagram",
    description:
      overrides?.description ||
      "A simplified pathway illustration of neural signaling stages.",
    type: overrides?.type || "diagram",
    svgCode:
      overrides?.svgCode ||
      `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect x="20" y="20" width="300" height="120" fill="#dbeafe"/></svg>`,
    figureCaption:
      overrides?.figureCaption === undefined
        ? "Figure 1. Neural signaling stages."
        : overrides.figureCaption,
    notes: overrides?.notes === undefined ? null : overrides.notes,
  };
}

async function buildAiIllustrationApp(userId: string) {
  const { default: Fastify } = await import("fastify");
  const { default: aiWritingAssistantRoutes } = await import(
    "../../src/routes/ai-writing-assistant.js"
  );

  const app = Fastify({ logger: false });
  app.decorate("authenticate", async (request) => {
    (
      request as typeof request & {
        user?: { sub: string; email: string };
      }
    ).user = {
      sub: userId,
      email: "owner@example.com",
    };
  });

  await app.register(aiWritingAssistantRoutes, { prefix: "/api" });
  return app;
}

describe("AI writing assistant illustration endpoint", () => {
  const projectId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

  beforeEach(() => {
    vi.resetModules();

    checkProjectAccessPoolMock.mockReset();
    getUserApiKeyMock.mockReset();
    queryMock.mockReset();
    uploadFileMock.mockReset();
    deleteFileMock.mockReset();
    isStorageConfiguredMock.mockReset();
    generateStoragePathMock.mockReset();
    prismaProjectFileCreateMock.mockReset();
    invalidateFilesMock.mockReset();
    fetchMock.mockReset();

    vi.stubGlobal("fetch", fetchMock);

    checkProjectAccessPoolMock.mockResolvedValue({
      ok: true,
      role: "owner",
      canEdit: true,
    });
    getUserApiKeyMock.mockResolvedValue("openrouter-test-key");
    isStorageConfiguredMock.mockReturnValue(true);
    generateStoragePathMock.mockReturnValue(`projects/${projectId}/ai-1.svg`);
    uploadFileMock.mockResolvedValue(undefined);
    deleteFileMock.mockResolvedValue(undefined);
    invalidateFilesMock.mockResolvedValue(undefined);
    prismaProjectFileCreateMock.mockResolvedValue({
      id: "file-illustration-1",
      name: "ai-illustration-1.svg",
      mimeType: "image/svg+xml",
      category: "image",
      size: 1024,
    });
  });

  it("generates, validates and persists illustration successfully", async () => {
    setTestEnv({ agenticEnabled: false });
    fetchMock.mockResolvedValueOnce(
      createOpenRouterResponse(
        JSON.stringify(createValidIllustrationResponse({ notes: "ok" })),
      ),
    );

    const app = await buildAiIllustrationApp(userId);
    const response = await app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/ai-writing-assistant/generate-illustration`,
      payload: {
        selectedText: "Signal transduction in central neurons.",
        illustrationType: "diagram",
      },
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload.ok).toBe(true);
    expect(payload.projectFile).toEqual({
      id: "file-illustration-1",
      name: "ai-illustration-1.svg",
      mimeType: "image/svg+xml",
      category: "image",
    });
    expect(payload.pipeline).toMatchObject({
      mode: "baseline",
      usedFallback: false,
    });
    expect(uploadFileMock).toHaveBeenCalledTimes(1);
    expect(prismaProjectFileCreateMock).toHaveBeenCalledTimes(1);
    await app.close();
  });

  it("returns predictable error on invalid LLM JSON", async () => {
    setTestEnv({ agenticEnabled: false });
    fetchMock.mockResolvedValueOnce(
      createOpenRouterResponse("not-a-json-payload"),
    );

    const app = await buildAiIllustrationApp(userId);
    const response = await app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/ai-writing-assistant/generate-illustration`,
      payload: {
        selectedText: "Cell cycle summary text.",
        illustrationType: "schema",
      },
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toMatchObject({
      error: "Invalid AI illustration response format",
      code: "AI_RESPONSE_PARSE_ERROR",
    });
    await app.close();
  });

  it("returns failure when upstream LLM call fails", async () => {
    setTestEnv({ agenticEnabled: false });
    fetchMock.mockRejectedValueOnce(new Error("network-failure"));

    const app = await buildAiIllustrationApp(userId);
    const response = await app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/ai-writing-assistant/generate-illustration`,
      payload: {
        selectedText: "Failure path test text.",
        illustrationType: "diagram",
      },
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toMatchObject({
      error: "AI illustration generation failed",
    });
    await app.close();
  });

  it("returns predictable error on structurally invalid LLM JSON", async () => {
    setTestEnv({ agenticEnabled: false });
    fetchMock.mockResolvedValueOnce(
      createOpenRouterResponse(
        JSON.stringify({
          title: "Broken payload",
          description: "Missing svgCode and required fields",
          type: "diagram",
        }),
      ),
    );

    const app = await buildAiIllustrationApp(userId);
    const response = await app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/ai-writing-assistant/generate-illustration`,
      payload: {
        selectedText: "Metabolic flow summary.",
        illustrationType: "flowchart",
      },
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toMatchObject({
      error: "Invalid AI illustration response format",
      code: "AI_RESPONSE_SCHEMA_ERROR",
    });
    await app.close();
  });

  it("uses baseline single-shot mode when feature flag is off", async () => {
    setTestEnv({ agenticEnabled: false });
    fetchMock.mockResolvedValueOnce(
      createOpenRouterResponse(JSON.stringify(createValidIllustrationResponse())),
    );

    const app = await buildAiIllustrationApp(userId);
    const response = await app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/ai-writing-assistant/generate-illustration`,
      payload: {
        selectedText: "Baseline mode test text.",
        illustrationType: "auto",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().pipeline).toMatchObject({
      mode: "baseline",
      usedFallback: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await app.close();
  });

  it("uses planner+critic path when feature flag is on", async () => {
    setTestEnv({ agenticEnabled: true, maxCriticRounds: 1 });
    fetchMock
      .mockResolvedValueOnce(
        createOpenRouterResponse(
          JSON.stringify({
            enhancedDescription:
              "Сформируй диаграмму из 4 блоков: входные данные, обработка, валидация и вывод результата для научного workflow.",
          }),
        ),
      )
      .mockResolvedValueOnce(
        createOpenRouterResponse(JSON.stringify(createValidIllustrationResponse())),
      )
      .mockResolvedValueOnce(
        createOpenRouterResponse(
          JSON.stringify({
            needsRevision: false,
            issues: [],
          }),
        ),
      );

    const app = await buildAiIllustrationApp(userId);
    const response = await app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/ai-writing-assistant/generate-illustration`,
      payload: {
        selectedText: "Agentic mode test text.",
        illustrationType: "diagram",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().pipeline).toMatchObject({
      mode: "agentic",
      usedFallback: false,
      criticIterations: 0,
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    await app.close();
  });

  it("sanitizes SVG before persistence and response output", async () => {
    setTestEnv({ agenticEnabled: false });
    fetchMock.mockResolvedValueOnce(
      createOpenRouterResponse(
        JSON.stringify(
          createValidIllustrationResponse({
            svgCode:
              '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><script>alert(1)</script><rect onclick="alert(2)" width="120" height="60"/></svg>',
          }),
        ),
      ),
    );

    const app = await buildAiIllustrationApp(userId);
    const response = await app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/ai-writing-assistant/generate-illustration`,
      payload: {
        selectedText: "Sanitization test text.",
        illustrationType: "diagram",
      },
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload.svgCode).not.toMatch(/<script/i);
    expect(payload.svgCode).not.toMatch(/on[a-z]+\s*=/i);

    const uploadedSvg = (
      uploadFileMock.mock.calls[0]?.[1] as Buffer | undefined
    )?.toString("utf8");
    expect(uploadedSvg).toBeDefined();
    expect(uploadedSvg).not.toMatch(/<script/i);
    expect(uploadedSvg).not.toMatch(/on[a-z]+\s*=/i);
    await app.close();
  });
});
