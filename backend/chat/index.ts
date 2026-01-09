import { convertToModelMessages, generateText, ModelMessage, stepCountIs, streamText, tool, UIMessage } from 'ai'
import { Elysia } from 'elysia'
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import z from "zod"
import path from "path"

// Import RAG Backend Logic
import { PDFtoTXT, preprocessText } from "../src/Process"
import { ChunkAndEmbed } from "../src/Chunk"
import { Embed } from "../src/Embed"
import { HybridRetriever } from "../src/Retrieval"

const App = new Elysia()
const APIKEY = ""

// --- Global Retriever Initialization ---
let retriever: HybridRetriever | null = null;

async function initializeRetriever() {
    if (retriever) return;
    try {
        console.log("Initializing RAG System...");
        console.time("RAG_Init");

        // 1. Load PDF
        // Adjust path based on where you run 'bun' from. Assuming root.
        const filePath = path.join(process.cwd(), "Data", "Files", "FSB.pdf");
        const file = Bun.file(filePath);

        if (!await file.exists()) {
            console.error(`File not found at: ${filePath}`);
            return;
        }

        // 2. Process
        let text = await PDFtoTXT(file);
        text = await preprocessText(text);

        // 3. Chunk & Embed
        const chunks = await ChunkAndEmbed(text);

        // 4. Index
        retriever = new HybridRetriever(chunks);

        console.timeEnd("RAG_Init");
        console.log(`RAG System Ready. Indexed ${chunks.length} chunks.`);
    } catch (err) {
        console.error("Failed to initialize RAG system:", err);
    }
}

await initializeRetriever();


const RagTool = tool({
    description: "Search for specific information about universities, faculties , and career paths within the official documents.",
    inputSchema: z.object({
        query: z.string().describe("The specific search term or question to look up"),
    }),
    execute: async ({ query }) => {
        console.log("Tool calling with query:", query);

        if (!retriever) {
            return "System Error: RAG system is not initialized yet. Please try again later.";
        }

        try {
            // Generate embedding for query
            const queryEmbedding = await Embed(query);

            // Search (Top 5)
            const results = await retriever.search(query, queryEmbedding, 5);

            if (results.length === 0) {
                return "No relevant information found in the documents.";
            }

            // Format results for the LLM
            const context = results.map((r, i) => `[Content ${i + 1}] (Score: ${r.score.toFixed(2)}):\n${r.text}`).join("\n\n---\n\n");

            return `Here is the relevant information retrieved from the documents:\n\n${context}`;
        } catch (error) {
            console.error("Error during retrieval:", error);
            return "Error occurred while searching details.";
        }
    }
})


App.post("/api/chat", async ({ body, set }) => {
    //@ts-ignore
    const { messages }: { messages: UIMessage[] } = body;

    // AI here 
    const AiResponce = streamText({
        model: createOpenRouter({ apiKey: APIKEY })("google/gemini-2.5-flash"),
        system: "The user is looking to get advice on career study path. Guide him. You have access to a RAG tool that searches the official universities documents. ALWAYS use the RAG tool if the user asks about courses, curriculums, directors, or specific faculty details. Answer in French if the user asks in French.",
        messages: await convertToModelMessages(messages),

        stopWhen: stepCountIs(5),
        tools: {
            RAG: RagTool
        }
    })

    return AiResponce.toUIMessageStreamResponse()
})

export default App
