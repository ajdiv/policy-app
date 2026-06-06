import "dotenv/config";

/** Central place for env-derived configuration and model names. */
export const config = {
  port: Number(process.env.PORT ?? 3000),
  congressGovApiKey: process.env.CONGRESS_GOV_API_KEY ?? "",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  generationModel: process.env.GEMINI_GENERATION_MODEL ?? "gemini-2.5-flash",
  embeddingModel: process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-001",
  /** Output dimensionality we request from the embedding model (it defaults to 3072). */
  embeddingDim: 768,
};

export const hasGemini = () => config.geminiApiKey.length > 0;
export const hasCongressGov = () => config.congressGovApiKey.length > 0;
