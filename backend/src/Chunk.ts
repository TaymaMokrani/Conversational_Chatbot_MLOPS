import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { Embed } from "./Embed"
import { loadParams } from "./params_config_versions/load_params"

const PARAMS = loadParams("v1")

export async function splitIntoSentences(markdown: string): Promise<string[]> {
  return await RecursiveCharacterTextSplitter.fromLanguage("markdown", {
    chunkSize: PARAMS.chunking.chunkSize,
    chunkOverlap: PARAMS.chunking.overlapSize,
  }).splitText(markdown)
}

export async function ChunkAndEmbed(
  markdown: string,
  source?: string
) {
  const sentences = await splitIntoSentences(markdown)

  return await Promise.all(
    sentences.map(async (sentence) => ({
      id: crypto.randomUUID(),
      text: sentence,
      embedding: await Embed(sentence),
      metadata: source ? { source } : undefined,
    }))
  )
}
