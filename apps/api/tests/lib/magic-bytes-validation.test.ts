import { describe, expect, it, vi } from "vitest";

// Mock file-type module
const mockFileTypeFromBuffer = vi.fn();
vi.mock("file-type", () => ({
  fileTypeFromBuffer: mockFileTypeFromBuffer,
}));

// Mock env for S3 config
vi.mock("../../src/env.js", () => ({
  env: {
    S3_ENDPOINT: "https://s3.example.com",
    S3_ACCESS_KEY_ID: "test",
    S3_SECRET_ACCESS_KEY: "test",
    S3_BUCKET_NAME: "test-bucket",
    S3_REGION: "us-east-1",
    MAX_FILE_SIZE_MB: 500,
  },
}));

import { validateFileMagicBytes } from "../../src/lib/storage.js";

describe("validateFileMagicBytes", () => {
  it("should accept PDF buffer with application/pdf MIME type", async () => {
    mockFileTypeFromBuffer.mockResolvedValue({
      ext: "pdf",
      mime: "application/pdf",
    });

    const pdfBuffer = Buffer.from("%PDF-1.4 fake pdf content");
    const result = await validateFileMagicBytes(pdfBuffer, "application/pdf");

    expect(result.valid).toBe(true);
  });

  it("should reject PDF buffer with image/png MIME type", async () => {
    mockFileTypeFromBuffer.mockResolvedValue({
      ext: "pdf",
      mime: "application/pdf",
    });

    const pdfBuffer = Buffer.from("%PDF-1.4 fake pdf content");
    const result = await validateFileMagicBytes(pdfBuffer, "image/png");

    expect(result.valid).toBe(false);
    expect(result.detectedType).toBe("application/pdf");
  });

  it("should reject HTML file disguised as application/pdf", async () => {
    mockFileTypeFromBuffer.mockResolvedValue({
      ext: "html",
      mime: "text/html",
    });

    const htmlBuffer = Buffer.from("<html><body>XSS attack</body></html>");
    const result = await validateFileMagicBytes(htmlBuffer, "application/pdf");

    expect(result.valid).toBe(false);
    expect(result.detectedType).toBe("text/html");
  });

  it("should allow unrecognizable file types through (null detection)", async () => {
    mockFileTypeFromBuffer.mockResolvedValue(undefined);

    const unknownBuffer = Buffer.from("some unknown content");
    const result = await validateFileMagicBytes(
      unknownBuffer,
      "application/msword",
    );

    expect(result.valid).toBe(true);
  });

  it("should accept JPEG buffer with image/jpeg MIME type", async () => {
    mockFileTypeFromBuffer.mockResolvedValue({
      ext: "jpg",
      mime: "image/jpeg",
    });

    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    const result = await validateFileMagicBytes(jpegBuffer, "image/jpeg");

    expect(result.valid).toBe(true);
  });

  it("should accept DOCX (zip) buffer with docx MIME type", async () => {
    // DOCX files are detected as ZIP by file-type
    mockFileTypeFromBuffer.mockResolvedValue({
      ext: "zip",
      mime: "application/zip",
    });

    const docxBuffer = Buffer.from("PK\x03\x04 fake docx");
    const result = await validateFileMagicBytes(
      docxBuffer,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );

    expect(result.valid).toBe(true);
  });

  it("should reject executable disguised as image", async () => {
    mockFileTypeFromBuffer.mockResolvedValue({
      ext: "exe",
      mime: "application/x-msdownload",
    });

    const exeBuffer = Buffer.from("MZ\x90\x00 fake exe");
    const result = await validateFileMagicBytes(exeBuffer, "image/png");

    expect(result.valid).toBe(false);
    expect(result.detectedType).toBe("application/x-msdownload");
  });
});
