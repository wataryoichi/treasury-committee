export interface Case {
  id: string;
  name: string;
  companyName: string;
  jurisdiction: string;
  cashUsd: number;
  marketCapUsd: number;
  netDebtUsd: number;
  treasuryObjective: string;
  candidateAssets: string[];
  minLiquidityMonths: number;
  maxDrawdown: number;
  derivativesAllowed: boolean;
  physicalOnly: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type CaseInput = Omit<Case, "id" | "createdAt" | "updatedAt">;

export type PersonaRole =
  | "chair"
  | "bitcoin_strategist"
  | "gold_strategist"
  | "macro_strategist"
  | "risk_officer"
  | "editor";

export interface PersonaConfig {
  id: string;
  key: PersonaRole;
  displayName: string;
  enabled: boolean;
  roleDescription: string;
  philosophy: string;
  outputStyle: string;
  systemPrompt: string;
  modelOverride?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type RunStatus = "pending" | "running" | "completed" | "failed";

export interface Run {
  id: string;
  caseId: string;
  status: RunStatus;
  startedAt: string;
  completedAt?: string;
  summary?: string;
  finalRecommendation?: string;
  rawOutputJson?: string;
  markdownReport?: string;
  errorMessage?: string;
}

export type StepType =
  | "chair_opening"
  | "specialist_view"
  | "rebuttal"
  | "risk_assessment"
  | "chair_synthesis"
  | "final_report";

export interface RunStep {
  id: string;
  runId: string;
  stepType: StepType;
  personaKey: PersonaRole;
  status: "pending" | "running" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
  outputJson?: string;
  errorMessage?: string;
}

export interface SpecialistOutput {
  summary: string;
  key_arguments: string[];
  risks: string[];
  recommendation: string;
  confidence: number;
}

export interface ChairOutput {
  executive_summary: string;
  scenarios: {
    base: string;
    bull: string;
    bear: string;
  };
  specialist_views_summary: Record<string, string>;
  risk_summary: string;
  proposed_allocation: Record<string, number>;
  reasons_not_to_act: string[];
  monitoring_kpis: string[];
}

export type LLMProvider = "openrouter" | "anthropic" | "openai" | "lmstudio" | "dummy";

export interface ModelSettings {
  id: string;
  provider: LLMProvider;
  apiKey: string;
  model: string;
  baseUrl: string;
  temperature: number;
  maxTokens: number;
  updatedAt: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  costTier: "free" | "low" | "mid" | "high" | "premium";
  inputPricePerM: number;   // $ per 1M tokens
  outputPricePerM: number;  // $ per 1M tokens
  contextK: number;         // context window in K tokens
}

export const OPENROUTER_MODELS: ModelInfo[] = [
  // Anthropic
  { id: "anthropic/claude-opus-4", name: "Claude Opus 4", provider: "Anthropic", costTier: "premium", inputPricePerM: 15, outputPricePerM: 75, contextK: 200 },
  { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", provider: "Anthropic", costTier: "mid", inputPricePerM: 3, outputPricePerM: 15, contextK: 200 },
  { id: "anthropic/claude-haiku-4", name: "Claude Haiku 4", provider: "Anthropic", costTier: "low", inputPricePerM: 0.8, outputPricePerM: 4, contextK: 200 },
  // OpenAI
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "OpenAI", costTier: "mid", inputPricePerM: 2.5, outputPricePerM: 10, contextK: 128 },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", costTier: "low", inputPricePerM: 0.15, outputPricePerM: 0.6, contextK: 128 },
  { id: "openai/o3-mini", name: "o3-mini", provider: "OpenAI", costTier: "mid", inputPricePerM: 1.1, outputPricePerM: 4.4, contextK: 200 },
  // Google
  { id: "google/gemini-2.5-pro-preview", name: "Gemini 2.5 Pro", provider: "Google", costTier: "mid", inputPricePerM: 1.25, outputPricePerM: 10, contextK: 1000 },
  { id: "google/gemini-2.5-flash-preview", name: "Gemini 2.5 Flash", provider: "Google", costTier: "low", inputPricePerM: 0.15, outputPricePerM: 0.6, contextK: 1000 },
  // DeepSeek
  { id: "deepseek/deepseek-r1", name: "DeepSeek R1", provider: "DeepSeek", costTier: "low", inputPricePerM: 0.55, outputPricePerM: 2.19, contextK: 164 },
  { id: "deepseek/deepseek-chat-v3-0324", name: "DeepSeek V3", provider: "DeepSeek", costTier: "low", inputPricePerM: 0.27, outputPricePerM: 1.1, contextK: 164 },
  // Qwen
  { id: "qwen/qwen3-235b-a22b", name: "Qwen3 235B", provider: "Qwen", costTier: "low", inputPricePerM: 0.39, outputPricePerM: 2.34, contextK: 262 },
  { id: "qwen/qwen3-32b", name: "Qwen3 32B", provider: "Qwen", costTier: "low", inputPricePerM: 0.2, outputPricePerM: 1.56, contextK: 262 },
  { id: "qwen/qwen3-30b-a3b", name: "Qwen3 30B MoE", provider: "Qwen", costTier: "low", inputPricePerM: 0.13, outputPricePerM: 0.75, contextK: 262 },
  // Mistral
  { id: "mistralai/mistral-large-2411", name: "Mistral Large", provider: "Mistral", costTier: "mid", inputPricePerM: 2, outputPricePerM: 6, contextK: 128 },
  { id: "mistralai/mistral-small-2503", name: "Mistral Small", provider: "Mistral", costTier: "low", inputPricePerM: 0.1, outputPricePerM: 0.3, contextK: 128 },
  // Meta
  { id: "meta-llama/llama-4-maverick", name: "Llama 4 Maverick", provider: "Meta", costTier: "low", inputPricePerM: 0.2, outputPricePerM: 0.6, contextK: 1000 },
  { id: "meta-llama/llama-4-scout", name: "Llama 4 Scout", provider: "Meta", costTier: "low", inputPricePerM: 0.15, outputPricePerM: 0.4, contextK: 512 },
  // GLM / ZhipuAI
  { id: "zhipu/glm-4-plus", name: "GLM-4 Plus", provider: "ZhipuAI", costTier: "low", inputPricePerM: 0.39, outputPricePerM: 1.75, contextK: 128 },
  // Kimi / Moonshot
  { id: "moonshotai/kimi-k2", name: "Kimi K2", provider: "Moonshot", costTier: "low", inputPricePerM: 0.45, outputPricePerM: 2.2, contextK: 262 },
];

export const COST_TIER_LABELS: Record<ModelInfo["costTier"], { label: string; color: string }> = {
  free:    { label: "無料", color: "bg-green-100 text-green-800" },
  low:     { label: "$", color: "bg-blue-100 text-blue-800" },
  mid:     { label: "$$", color: "bg-yellow-100 text-yellow-800" },
  high:    { label: "$$$", color: "bg-orange-100 text-orange-800" },
  premium: { label: "$$$$", color: "bg-red-100 text-red-800" },
};

export const PROVIDER_MODELS: Record<LLMProvider, string[]> = {
  openrouter: OPENROUTER_MODELS.map((m) => m.id),
  anthropic: [
    "claude-sonnet-4-20250514",
    "claude-opus-4-20250514",
    "claude-haiku-4-20250506",
  ],
  openai: [
    "gpt-4o",
    "gpt-4o-mini",
  ],
  lmstudio: [],
  dummy: ["dummy"],
};
