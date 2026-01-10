import { cosineSimilarity } from "ai";
import { removeStopwords } from "stopword";
import { loadParams } from "./params_config_versions/load_params"
const PARAMS = loadParams("v1")

export type DocumentChunk = {
    id: string;
    text: string;
    embedding?: number[];
    metadata?: any;
};

export type ScoredChunk = DocumentChunk & {
    score: number;
};

/**
 * Simple in-memory Vector Store (simulating FAISS for this scale)
 * storing embeddings and performing cosine similarity search.
 */
export class VectorStore {
    private chunks: DocumentChunk[] = [];

    constructor(initialChunks: DocumentChunk[] = []) {
        this.chunks = initialChunks;
    }

    addDocuments(chunks: DocumentChunk[]) {
        this.chunks.push(...chunks);
    }

    async search(queryEmbedding: number[], k: number = 5): Promise<ScoredChunk[]> {
        if (!queryEmbedding) return [];

        const scored = this.chunks.map(chunk => {
            if (!chunk.embedding) return { ...chunk, score: -1 };
            const sim = cosineSimilarity(chunk.embedding, queryEmbedding);
            return {
                ...chunk,
                score: sim
            };
        });

        return scored
            .sort((a, b) => b.score - a.score)
            .slice(0, k);
    }
}

/**
 * BM25 Implementation
 * Okapi BM25 ranking function.
 */
export class BM25Retriever {
    private documents: DocumentChunk[] = [];
    private docTokens: string[][] = [];
    private docLengths: number[] = [];
    private avgdl: number = 0;
    private idf: Map<string, number> = new Map();

    // Tuning parameters
    private k1: number = PARAMS.retrieval.bm25.k1
    private b: number = PARAMS.retrieval.bm25.b


    constructor(docs: DocumentChunk[]) {
        this.documents = docs;
        this.buildIndex();
    }

    private tokenize(text: string): string[] {
        // Simple tokenization: lowercase, remove non-alphanumeric, split by space
        let tokens = text.toLowerCase()
            .replace(/[^a-z0-9\s]/g, "")
            .split(/\s+/)
            .filter(t => t.length > 0);

        // Remove stopwords
        return removeStopwords(tokens);
    }

    private buildIndex() {
        this.docTokens = this.documents.map(d => this.tokenize(d.text));
        this.docLengths = this.docTokens.map(t => t.length);
        const totalTokens = this.docLengths.reduce((a, b) => a + b, 0);
        this.avgdl = this.documents.length > 0 ? totalTokens / this.documents.length : 0;

        // Calculate IDF for all unique terms
        const allTokens = new Set<string>();
        this.docTokens.forEach(tokens => tokens.forEach(t => allTokens.add(t)));

        this.idf.clear();
        allTokens.forEach(token => {
            let docCount = 0;
            this.docTokens.forEach(tokens => {
                if (tokens.includes(token)) docCount++;
            });
            // Standard IDF formula with smoothing
            const idfScore = Math.log(1 + (this.documents.length - docCount + 0.5) / (docCount + 0.5));
            this.idf.set(token, Math.max(idfScore, 0)); // Clamp at 0
        });
    }

    search(query: string, k: number = 5): ScoredChunk[] {
        const queryTokens = this.tokenize(query);

        const scores = this.documents.map((doc, idx) => {
            let score = 0;
            const docLen = this.docLengths[idx];
            const tokens = this.docTokens[idx];

            queryTokens.forEach(qToken => {
                if (!this.idf.has(qToken)) return;

                const tf = tokens.filter(t => t === qToken).length;
                const idf = this.idf.get(qToken)!;

                const numerator = idf * tf * (this.k1 + 1);
                const denominator = tf + this.k1 * (1 - this.b + this.b * (docLen / this.avgdl));

                score += numerator / denominator;
            });

            return {
                ...doc,
                score
            };
        });

        return scores
            .sort((a, b) => b.score - a.score)
            .slice(0, k);
    }
}

/**
 * Hybrid Retriever combining BM25 and Vector Search
 * Uses RRF (Reciprocal Rank Fusion) or simple weighted sum.
 * We'll use Weighted Sum for simplicity but RRF is better for uncalibrated scores.
 * Let's implement RRF as it is robust.
 */
export class HybridRetriever {
    private vectorStore: VectorStore;
    private bm25: BM25Retriever;

    constructor(chunks: DocumentChunk[]) {
        this.vectorStore = new VectorStore(chunks);
        this.bm25 = new BM25Retriever(chunks);
    }

    async search(
  queryText: string,
  queryEmbedding: number[]
): Promise<ScoredChunk[]> {

  const topK = PARAMS.retrieval.topK
  const rrfK = PARAMS.retrieval.hybrid.rrfK

  // 1. Retrieve candidates
  const vectorResults = await this.vectorStore.search(
    queryEmbedding,
    topK * 2
  )

  const bm25Results = this.bm25.search(
    queryText,
    topK * 2
  )

  // 2. Reciprocal Rank Fusion (RRF)
  const scores = new Map<string, number>()
  const docMap = new Map<string, DocumentChunk>()

  const addScores = (results: ScoredChunk[]) => {
    results.forEach((res, rank) => {
      const prevScore = scores.get(res.id) ?? 0
      scores.set(res.id, prevScore + 1 / (rrfK + rank + 1))
      docMap.set(res.id, res)
    })
  }

  addScores(vectorResults)
  addScores(bm25Results)

  // 3. Sort & return topK
  return Array.from(scores.entries())
    .map(([id, score]) => ({
      ...docMap.get(id)!,
      score
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}
}
