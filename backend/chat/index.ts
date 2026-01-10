import { convertToModelMessages, generateText, ModelMessage, stepCountIs, streamText, tool, UIMessage } from 'ai'
import { Elysia } from 'elysia'
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import z from "zod"
import path from "path"
import fs from "fs"

import { loadConfig } from "./load_config"
const CONFIG = loadConfig("v1")


// Import RAG Backend Logic
import { PDFtoTXT, preprocessText } from "../src/Process"
import { ChunkAndEmbed } from "../src/Chunk"
import { Embed } from "../src/Embed"
import { HybridRetriever } from "../src/Retrieval"

const App = new Elysia()
const APIKEY = ""

// --- Global Retriever Initialization ---
let retriever: HybridRetriever | null = null;

// Cache configuration
const CACHE_DIR = path.join(process.cwd(), "Data", "cache");
const CACHE_FILE = path.join(CACHE_DIR, "chunks.json");

interface CacheData {
    hash: string;
    chunks: Array<{ id: string; text: string; embedding: number[] }>;
    createdAt: string;
}

// Generate a hash based on PDF files and their modification times
function generateFilesHash(filesDir: string, pdfFiles: string[]): string {
    const fileInfos = pdfFiles.map(file => {
        const filePath = path.join(filesDir, file);
        const stats = fs.statSync(filePath);
        return `${file}:${stats.size}:${stats.mtimeMs}`;
    }).sort().join("|");

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < fileInfos.length; i++) {
        const char = fileInfos.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(16);
}

// Load chunks from cache if valid
function loadFromCache(expectedHash: string): CacheData | null {
    try {
        if (!fs.existsSync(CACHE_FILE)) {
            return null;
        }

        const cacheContent = fs.readFileSync(CACHE_FILE, 'utf-8');
        const cache: CacheData = JSON.parse(cacheContent);

        if (cache.hash === expectedHash) {
            return cache;
        }

        console.log("📦 Cache hash mismatch - PDFs have changed, rebuilding...");
        return null;
    } catch (err) {
        console.warn("⚠️ Failed to load cache:", err);
        return null;
    }
}

// Save chunks to cache
function saveToCache(hash: string, chunks: Array<{ id: string; text: string; embedding: number[] }>): void {
    try {
        if (!fs.existsSync(CACHE_DIR)) {
            fs.mkdirSync(CACHE_DIR, { recursive: true });
        }

        const cacheData: CacheData = {
            hash,
            chunks,
            createdAt: new Date().toISOString()
        };

        fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData));
        console.log(`💾 Cache saved to ${CACHE_FILE}`);
    } catch (err) {
        console.error("❌ Failed to save cache:", err);
    }
}

async function initializeRetriever() {
    if (retriever) return;
    try {
        console.log("Initializing RAG System...");
        console.time("RAG_Init");

        // 1. Load all PDF files from Data/Files directory
        const filesDir = path.join(process.cwd(), "Data", "Files");

        if (!fs.existsSync(filesDir)) {
            console.error(`Directory not found: ${filesDir}`);
            return;
        }

        // Get all PDF files in the directory
        const pdfFiles = fs.readdirSync(filesDir).filter(file => file.toLowerCase().endsWith('.pdf'));

        if (pdfFiles.length === 0) {
            console.error("No PDF files found in Data/Files directory");
            return;
        }

        console.log(`Found ${pdfFiles.length} PDF files: ${pdfFiles.join(', ')}`);

        // Generate hash for current PDF files state
        const filesHash = generateFilesHash(filesDir, pdfFiles);
        console.log(`📋 Files hash: ${filesHash}`);

        // Try to load from cache
        const cachedData = loadFromCache(filesHash);

        if (cachedData) {
            console.log(`\n⚡ Loading ${cachedData.chunks.length} chunks from cache (created: ${cachedData.createdAt})`);
            retriever = new HybridRetriever(cachedData.chunks);
            console.timeEnd("RAG_Init");
            console.log(`RAG System Ready. Loaded ${cachedData.chunks.length} cached chunks from ${pdfFiles.length} documents.`);
            return;
        }

        console.log("\n🔄 No valid cache found, processing PDFs...");

        // 2. Process each PDF separately and chunk with source metadata
        type ChunkType = { id: string; text: string; embedding: number[]; metadata?: { source: string } };
        let allChunks: ChunkType[] = [];
        const totalFiles = pdfFiles.length;

        for (let i = 0; i < pdfFiles.length; i++) {
            const pdfFile = pdfFiles[i];
            const filePath = path.join(filesDir, pdfFile);
            const file = Bun.file(filePath);

            if (!await file.exists()) {
                console.warn(`File not found at: ${filePath}, skipping...`);
                continue;
            }

            const fileStart = performance.now();
            console.log(`\n📄 Processing [${i + 1}/${totalFiles}]: ${pdfFile}`);

            try {
                // Extract and preprocess text
                let text = await PDFtoTXT(file);
                text = await preprocessText(text);

                const extractEnd = performance.now();
                const extractDuration = ((extractEnd - fileStart) / 1000).toFixed(2);
                console.log(`   📝 Extracted ${text.length} characters in ${extractDuration}s`);

                // Chunk and embed this file with source metadata
                const chunkStart = performance.now();
                const fileChunks = await ChunkAndEmbed(text, undefined, pdfFile);
                allChunks.push(...fileChunks);

                const chunkEnd = performance.now();
                const chunkDuration = ((chunkEnd - chunkStart) / 1000).toFixed(2);
                console.log(`   🔧 Created ${fileChunks.length} chunks in ${chunkDuration}s`);

                const totalDuration = ((chunkEnd - fileStart) / 1000).toFixed(2);
                console.log(`   ✅ Completed in ${totalDuration}s`);
            } catch (err) {
                const fileEnd = performance.now();
                const fileDuration = ((fileEnd - fileStart) / 1000).toFixed(2);
                console.error(`   ❌ Failed after ${fileDuration}s:`, err);
            }
        }

        if (allChunks.length === 0) {
            console.error("No chunks created from any PDF files");
            return;
        }

        console.log(`\n📊 Total: ${allChunks.length} chunks from ${pdfFiles.length} documents`);

        // 4. Save to cache for next startup
        saveToCache(filesHash, allChunks);

        // 5. Index
        retriever = new HybridRetriever(allChunks);

        console.timeEnd("RAG_Init");
        console.log(`RAG System Ready. Indexed ${allChunks.length} chunks from ${pdfFiles.length} documents.`);
    } catch (err) {
        console.error("Failed to initialize RAG system:", err);
    }
}

await initializeRetriever();


const RagTool = tool({
    description: "Search for specific information within the loaded documents. Use this tool to retrieve relevant content from the knowledge base.",
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

            // Search (Top k)
            const results = await retriever.search(
                query,
                queryEmbedding,
                CONFIG.rag.topK
                )

            if (results.length === 0) {
                return "No relevant information found in the documents.";
            }

            // Format results for the LLM with source information
            const context = results.map((r, i) => {
                const source = r.metadata?.source ? ` [Source: ${r.metadata.source}]` : '';
                return `[Content ${i + 1}]${source} (Score: ${r.score.toFixed(2)}):\n${r.text}`;
            }).join("\n\n---\n\n");
            console.log("Context:", context);
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
        model: createOpenRouter({ apiKey: APIKEY })(CONFIG.model.name),
        system: CONFIG.systemPrompt,
        messages: await convertToModelMessages(messages),

        stopWhen: stepCountIs(CONFIG.model.maxSteps),
        tools: {
            RAG: RagTool
        }
    })

    return AiResponce.toUIMessageStreamResponse()
})

export default App
