import { PDFParse } from "pdf-parse";
import { removeStopwords } from "stopword";
import { remove as removeDiacritics } from "diacritics";
import type { BunFile } from "bun";

export async function PDFtoTXT(file: BunFile): Promise<string> {
    const buffer = await file.arrayBuffer();
    const Parser = new PDFParse({ data:buffer });
    return (await Parser.getText()).text;
}


export async function preprocessText(text: string): Promise<string> {
  if (!text) return "";
  let cleaned = removeDiacritics(text);
  cleaned = cleaned.toLowerCase();
  cleaned = cleaned.replace(
    /\b(?:https?:\/\/|www\.)\S+\b/gi,
    ""
  );
  cleaned = cleaned.replace(
    /([\u2700-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF\uDC00-\uDFFF])/g,
    ""
  );
  cleaned = cleaned.replace(/[^a-z\s]/g, " ");
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  let tokens = cleaned.split(" ").filter(Boolean);
  tokens = removeStopwords(tokens);

  return tokens.join(" ");
}

