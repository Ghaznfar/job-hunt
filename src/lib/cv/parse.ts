import "server-only";

export type ResumeFileKind = "PDF" | "DOCX";

export const MAX_UPLOAD_BYTES = (Number(process.env.MAX_UPLOAD_MB) || 8) * 1024 * 1024;

export const ACCEPTED_MIME: Record<string, ResumeFileKind> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
};

export class UploadValidationError extends Error {}

/** Sniff the real file type from magic bytes; returns null if unrecognised. */
export function sniffKind(buf: Buffer): ResumeFileKind | null {
  if (buf.length >= 4 && buf.toString("ascii", 0, 4) === "%PDF") return "PDF";
  // DOCX is a ZIP container: 50 4B 03 04
  if (buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) {
    return "DOCX";
  }
  return null;
}

export function validateUpload(
  buf: Buffer,
  declaredMime: string,
  filename: string,
): { kind: ResumeFileKind } {
  if (buf.length === 0) throw new UploadValidationError("The file is empty.");
  if (buf.length > MAX_UPLOAD_BYTES) {
    throw new UploadValidationError(
      `File is too large. Maximum size is ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB.`,
    );
  }

  const declaredKind = ACCEPTED_MIME[declaredMime];
  const ext = filename.toLowerCase().split(".").pop();
  const extKind = ext === "pdf" ? "PDF" : ext === "docx" ? "DOCX" : null;
  const sniffed = sniffKind(buf);

  if (!sniffed) {
    throw new UploadValidationError("Unsupported file. Upload a PDF or DOCX résumé.");
  }
  // The magic bytes are authoritative. Declared MIME / extension must not conflict.
  if (declaredKind && declaredKind !== sniffed) {
    throw new UploadValidationError(
      "File content does not match its type. Upload a valid PDF or DOCX.",
    );
  }
  if (extKind && extKind !== sniffed) {
    throw new UploadValidationError("File extension does not match its content.");
  }
  return { kind: sniffed };
}

/** Extract plain text from a résumé file. Never throws on empty output. */
export async function extractText(buf: Buffer, kind: ResumeFileKind): Promise<string> {
  if (kind === "PDF") {
    const { extractText: extractPdfText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await extractPdfText(pdf, { mergePages: true });
    return normalizeText(Array.isArray(text) ? text.join("\n") : text);
  }
  // DOCX
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ buffer: buf });
  return normalizeText(value);
}

function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/ /g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
