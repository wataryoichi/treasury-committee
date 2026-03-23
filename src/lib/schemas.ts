import { z } from "zod";

export const caseSchema = z.object({
  name: z.string().min(1, "ケース名は必須です"),
  companyName: z.string().min(1, "企業名は必須です"),
  jurisdiction: z.string(),
  cashUsd: z.number().min(0, "負数は不可です"),
  marketCapUsd: z.number().min(0, "負数は不可です"),
  netDebtUsd: z.number(),
  treasuryObjective: z.string(),
  candidateAssets: z.array(z.string()).min(1, "候補資産は1件以上必須です"),
  minLiquidityMonths: z.number().min(0),
  maxDrawdown: z.number().min(0).max(1, "0〜1の範囲で指定してください"),
  derivativesAllowed: z.boolean(),
  physicalOnly: z.boolean(),
  notes: z.string(),
});

export type CaseFormValues = z.infer<typeof caseSchema>;

export const personaUpdateSchema = z.object({
  displayName: z.string().optional(),
  enabled: z.boolean().optional(),
  roleDescription: z.string().optional(),
  philosophy: z.string().optional(),
  outputStyle: z.string().optional(),
  systemPrompt: z.string().optional(),
  modelOverride: z.string().optional(),
});

export const runCreateSchema = z.object({
  caseId: z.string().min(1),
});
