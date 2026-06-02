import { AI_CONFIG, aiFetch } from "./config";

export interface OcrResult {
  text: string;
  pages?: { page: number; text: string }[];
  raw: unknown;
}

/**
 * Dispatch by file type:
 *  - PDF  → /api/pdf_extract/upload   (auto-detects scanned vs typed, OCRs as needed)
 *  - Image → /api/ocr_image/upload    (Typhoon Thai-domain OCR by default)
 *
 * Response shape (both endpoints): { text: string, chars: number, pages?: [...] }
 */
export async function ocr(file: File | Blob, signal?: AbortSignal): Promise<OcrResult> {
  const name = file instanceof File ? file.name : "upload";
  const type = (file.type || "").toLowerCase();
  const isPdf = type === "application/pdf" || /\.pdf$/i.test(name);

  const endpoint = isPdf ? "/api/pdf_extract/upload" : "/api/ocr_image/upload";

  const form = new FormData();
  form.append("file", file, name);
  if (isPdf) {
    form.append("fmt", "text");
    form.append("ocr_fallback", "auto");
  }

  const res = await aiFetch("ocr", `${AI_CONFIG.ocrBase}${endpoint}`, {
    method: "POST",
    body: form,
    signal,
  });
  const data = await res.json();
  const text: string = data?.text ?? data?.markdown ?? data?.result?.text ?? "";
  const pages = Array.isArray(data?.pages)
    ? data.pages.map((p: { page_index?: number; text?: string }, i: number) => ({
        page: p.page_index ?? i,
        text: p.text ?? "",
      }))
    : undefined;
  return { text, pages, raw: data };
}
