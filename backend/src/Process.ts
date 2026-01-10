import { PDFParse } from "pdf-parse"
import { remove as removeDiacritics } from "diacritics"
import type { BunFile } from "bun"
import { loadParams } from "./params_config_versions/load_params"

const PARAMS = loadParams("v1")

export async function PDFtoTXT(file: BunFile): Promise<string> {
  const buffer = await file.arrayBuffer()
  const parser = new PDFParse({ data: buffer })
  return (await parser.getText()).text
}

export async function preprocessText(text: string): Promise<string> {
  if (!text) return ""

  let cleaned = text

  if (PARAMS.processing.removeUrls) {
    cleaned = cleaned.replace(/\b(?:https?:\/\/|www\.)\S+\b/gi, "")
  }

  cleaned = cleaned.replace(/[\x00-\x09\x0b\x0c\x0e-\x1f\x7f-\x9f]/g, "")

  if (PARAMS.processing.normalizeWhitespace) {
    cleaned = cleaned.replace(/[ \t]+/g, " ")
  }

  if (PARAMS.processing.preserveNewlines) {
    cleaned = cleaned.replace(/\n\s*\n/g, "\n\n")
  }

  return cleaned.trim()
}
