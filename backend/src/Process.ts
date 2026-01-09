import { PDFParse } from "pdf-parse";
import { removeStopwords } from "stopword";
import { remove as removeDiacritics } from "diacritics";
import type { BunFile } from "bun";

export async function PDFtoTXT(file: BunFile): Promise<string> {
  const buffer = await file.arrayBuffer();
  const Parser = new PDFParse({ data: buffer });
  return (await Parser.getText()).text;
}


export async function preprocessText(text: string): Promise<string> {
  if (!text) return "";

  // Normalize whitespace (keep newlines for structure identification if needed, 
  // but usually for simple chunking we might want single spaces. 
  // However, Markdown splitter relies on newlines. Let's keep them for now or just normalize spacing.)
  // The original code was very aggressive.

  let cleaned = text;

  // Remove logical garbage but keep punctuation/numbers
  cleaned = cleaned.replace(
    /\b(?:https?:\/\/|www\.)\S+\b/gi,
    ""
  );

  // Fix common PDF artifacts (remove control chars but keep newlines/tabs)
  cleaned = cleaned.replace(/[\x00-\x09\x0b\x0c\x0e-\x1f\x7f-\x9f]/g, "");

  // Normalize whitespace:
  // Replace multiple spaces/tabs with single space, but preserve newlines (optional)
  // OR just collapse everything to single space if we want a flat string (but recursive split likes newlines).
  // Let's replace multiple spaces (not newlines) with single space.
  cleaned = cleaned.replace(/[ \t]+/g, " ");
  // Consolidate multiple newlines to double newline (paragraph)
  cleaned = cleaned.replace(/\n\s*\n/g, "\n\n");
  // Trim
  cleaned = cleaned.trim();

  // We could implement a more sophisticated pipeline here later if needed.
  // For RAG, we generally want the full text accessible.

  return cleaned;
}

