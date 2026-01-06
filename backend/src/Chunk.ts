import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Embed} from "./Embed";

export async function splitIntoSentences(
  markdown: string,
  config?: { chunkSize?: number; overlapSize?: number }
): Promise<string[]> {
  return await RecursiveCharacterTextSplitter.fromLanguage("markdown", {
    chunkSize: config?.chunkSize || 350,
    chunkOverlap: config?.overlapSize || 50,
  }).splitText(markdown);
}

export async function ChunkAndEmbed(
    markdown: string,
    config?: { chunkSize?: number; overlapSize?: number }
  ) {
    const Sentences = await splitIntoSentences(markdown, config);
    // console.log(Sentences)
    const embeddings = await Promise.all(
      Sentences.map(async (sentence) => ({
        text: sentence,
        embedding: await Embed(sentence),
      }))
    );
    return embeddings;
  }