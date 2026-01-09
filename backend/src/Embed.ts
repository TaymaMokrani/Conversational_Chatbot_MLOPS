import { pipeline } from "@xenova/transformers";

const Embedder = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
    
  );

  export const Embed = async (value: string) => {
    const output = await Embedder(value, { pooling: "mean", normalize: true });
    return Array.from(output.data as Float32Array);
  };
  