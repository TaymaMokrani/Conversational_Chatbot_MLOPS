//@ts-ignore
import fs from "fs"
//@ts-ignore
import path from "path"

export interface AppConfig {
  model: {
    provider: string
    name: string
    maxSteps: number
  }
  rag: {
    topK: number
  }
  systemPrompt: string
}

export function loadConfig(version = "v1"): AppConfig {
  const configPath = path.join(
    //@ts-ignore
    process.cwd(),
    "backend","chat",
    "model_config_versions",
    `${version}_config.json`
  )

  if (!fs.existsSync(configPath)) {
    throw new Error(`Config version not found: ${configPath}`)
  }

  return JSON.parse(fs.readFileSync(configPath, "utf-8"))
}
