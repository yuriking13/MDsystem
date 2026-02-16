import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type MockInstance,
} from "vitest";

describe("Logger Utils", () => {
  let originalEnv: string | undefined;
  let consoleLogSpy: MockInstance;
  let consoleErrorSpy: MockInstance;
  let consoleWarnSpy: MockInstance;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    vi.restoreAllMocks();
  });

  it("should import createLogger", async () => {
    const { createLogger } = await import("../../src/utils/logger.js");
    expect(createLogger).toBeDefined();
    expect(typeof createLogger).toBe("function");
  });

  it("should create a logger with context", async () => {
    const { createLogger } = await import("../../src/utils/logger.js");
    const log = createLogger("test-module");

    expect(log).toHaveProperty("info");
    expect(log).toHaveProperty("debug");
    expect(log).toHaveProperty("warn");
    expect(log).toHaveProperty("error");
  });

  it("should log info messages", async () => {
    const { createLogger } = await import("../../src/utils/logger.js");
    const log = createLogger("test");

    log.info("Test message");

    expect(consoleLogSpy).toHaveBeenCalled();
  });

  it("should log error messages with error object", async () => {
    const { createLogger } = await import("../../src/utils/logger.js");
    const log = createLogger("test");

    const error = new Error("Test error");
    log.error("Error occurred", error);

    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("should include metadata in logs", async () => {
    const { createLogger } = await import("../../src/utils/logger.js");
    const log = createLogger("test");

    log.info("Message with metadata", { userId: "123", action: "test" });

    expect(consoleLogSpy).toHaveBeenCalled();
    const callArg = consoleLogSpy.mock.calls[0][0];
    expect(callArg).toContain("userId");
  });
});
