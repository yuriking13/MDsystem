import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLogger } from "./logger";

describe("logger", () => {
  const originalEnv = import.meta.env.PROD;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createLogger", () => {
    it("should create logger with context", () => {
      const logger = createLogger("test-context");

      expect(logger).toHaveProperty("debug");
      expect(logger).toHaveProperty("info");
      expect(logger).toHaveProperty("warn");
      expect(logger).toHaveProperty("error");
    });

    it("should include context in log messages", () => {
      const logger = createLogger("my-component");
      logger.warn("test message");

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("[my-component]"),
      );
    });

    it("should include log level in messages", () => {
      const logger = createLogger("test");
      logger.warn("test message");

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("[WARN]"),
      );
    });
  });

  describe("log levels", () => {
    it("should call console.debug for debug level", () => {
      const logger = createLogger("test");
      logger.debug("debug message");

      expect(console.debug).toHaveBeenCalled();
    });

    it("should call console.info for info level", () => {
      const logger = createLogger("test");
      logger.info("info message");

      expect(console.info).toHaveBeenCalled();
    });

    it("should call console.warn for warn level", () => {
      const logger = createLogger("test");
      logger.warn("warn message");

      expect(console.warn).toHaveBeenCalled();
    });

    it("should call console.error for error level", () => {
      const logger = createLogger("test");
      logger.error("error message");

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("data logging", () => {
    it("should include data in log output", () => {
      const logger = createLogger("test");
      const testData = { key: "value", count: 42 };

      logger.info("message with data", testData);

      expect(console.info).toHaveBeenCalledWith(expect.any(String), testData);
    });

    it("should handle undefined data", () => {
      const logger = createLogger("test");
      logger.info("message without data");

      expect(console.info).toHaveBeenCalledWith(expect.any(String));
    });
  });

  describe("error logging", () => {
    it("should log error objects", () => {
      const logger = createLogger("test");
      const error = new Error("test error");

      logger.error("error occurred", error);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        error,
        undefined,
      );
    });

    it("should log error with additional data", () => {
      const logger = createLogger("test");
      const error = new Error("test error");
      const data = { userId: "123" };

      logger.error("error occurred", error, data);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        error,
        data,
      );
    });
  });
});
