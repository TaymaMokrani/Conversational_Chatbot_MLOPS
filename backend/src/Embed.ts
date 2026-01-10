import { pipeline } from "@xenova/transformers"
import { loadParams } from "./params_config_versions/load_params"

const PARAMS = loadParams("v1")

const Embedder = await pipeline(
  "feature-extraction",
  PARAMS.embedding.modelName
)

export const Embed = async (value: string) => {
  const output = await Embedder(value, {
    pooling: PARAMS.embedding.pooling,
    normalize: PARAMS.embedding.normalize
  })

  return Array.from(output.data as Float32Array)
}
