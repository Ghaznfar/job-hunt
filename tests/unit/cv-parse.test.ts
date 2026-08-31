import { describe, it, expect } from "vitest";
import { sniffKind, validateUpload, UploadValidationError, MAX_UPLOAD_BYTES } from "@/lib/cv/parse";

const PDF_MAGIC = Buffer.from("%PDF-1.7\n%\xE2\xE3\xCF\xD3\n", "latin1");
const DOCX_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]);
const JUNK = Buffer.from("just some text, not a document at all");

describe("sniffKind", () => {
  it("detects PDF from magic bytes", () => {
    expect(sniffKind(PDF_MAGIC)).toBe("PDF");
  });
  it("detects DOCX (zip) from magic bytes", () => {
    expect(sniffKind(DOCX_MAGIC)).toBe("DOCX");
  });
  it("returns null for unknown content", () => {
    expect(sniffKind(JUNK)).toBeNull();
  });
});

describe("validateUpload", () => {
  it("accepts a PDF with matching mime and extension", () => {
    expect(validateUpload(PDF_MAGIC, "application/pdf", "cv.pdf")).toEqual({ kind: "PDF" });
  });

  it("accepts a DOCX with matching mime", () => {
    expect(
      validateUpload(
        DOCX_MAGIC,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "cv.docx",
      ),
    ).toEqual({ kind: "DOCX" });
  });

  it("rejects an empty file", () => {
    expect(() => validateUpload(Buffer.alloc(0), "application/pdf", "cv.pdf")).toThrow(
      UploadValidationError,
    );
  });

  it("rejects a file over the size limit", () => {
    const big = Buffer.concat([PDF_MAGIC, Buffer.alloc(MAX_UPLOAD_BYTES + 1)]);
    expect(() => validateUpload(big, "application/pdf", "cv.pdf")).toThrow(/too large/i);
  });

  it("rejects content that does not match its declared type", () => {
    // PDF bytes but claims to be a DOCX
    expect(() =>
      validateUpload(
        PDF_MAGIC,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "cv.docx",
      ),
    ).toThrow(/does not match/i);
  });

  it("rejects an extension that conflicts with the content", () => {
    expect(() => validateUpload(PDF_MAGIC, "", "cv.docx")).toThrow(/extension/i);
  });

  it("rejects unrecognised content", () => {
    expect(() => validateUpload(JUNK, "application/pdf", "cv.pdf")).toThrow(/Unsupported/i);
  });
});
