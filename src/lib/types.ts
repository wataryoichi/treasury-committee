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

export const PROVIDER_MODELS: Record<LLMProvider, string[]> = {
  openrouter: [
    "anthropic/claude-sonnet-4",
    "anthropic/claude-opus-4",
    "anthropic/claude-haiku-4",
    "openai/gpt-4o",
    "openai/gpt-4o-mini",
    "google/gemini-2.5-pro-preview",
    "google/gemini-2.5-flash-preview",
    "deepseek/deepseek-r1",
    "deepseek/deepseek-chat-v3-0324",
  ],
  anthropic: [
    "claude-sonnet-4-20250514",
    "claude-opus-4-20250514",
    "claude-haiku-4-20250506",
  ],
  openai: [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
  ],
  lmstudio: [],
  dummy: ["dummy"],
};
