import {cosineSimilarity} from 'ai'
import { ChunkAndEmbed } from "./Chunk";
import { preprocessText } from "./Process";
import { Embed } from "./Embed";
import { PDFtoTXT } from "./Process";
import path from "path";

console.time("Main")
const file = Bun.file(path.join(process.cwd(), "Data", "Files", "FSB.pdf"));
let TextContent = await PDFtoTXT(file)

TextContent = await preprocessText(TextContent)

const EmbededData = await ChunkAndEmbed(TextContent)
const Q = "Directeur"
const InputObj = { 
    text:Q,
    embedding:await Embed(Q)
}


const SimilarityObj = EmbededData.map((e)=>{
    return {
        text:e.text,
        similarity:cosineSimilarity(e.embedding,InputObj.embedding)
    }
})
const K = 5
const TopKChunks = SimilarityObj.sort((a, b) => b.similarity - a.similarity).slice(0,K);
console.log(TopKChunks)
console.timeEnd("Main")



export { };

