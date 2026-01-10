//@ts-ignore
import fs from "node:fs"
//@ts-ignore
import path from "node:path"

export interface ParamsConfig {
  chunking: {
    chunkSize: number
    overlapSize: number
  }
  embedding: {
    modelName: string
    pooling: "mean" | "cls"
    normalize: boolean
  }
  processing: {
    removeUrls: boolean
    normalizeWhitespace: boolean
    preserveNewlines: boolean
  }
  retrieval: {
    topK: number
    bm25: {
      k1: number
      b: number
    }
    hybrid: {
      rrfK: number
    }
  }
}

export function loadParams(version = "v1"): ParamsConfig {
  const paramsPath = path.join(
    //@ts-ignore
    process.cwd(),
    "src",
    "params_config_versions",
    `${version}_params.json`
  )

  if (!fs.existsSync(paramsPath)) {
    throw new Error(`Params config not found: ${paramsPath}`)
  }

  return JSON.parse(fs.readFileSync(paramsPath, "utf-8"))
}
