import { z } from "zod";

// --- Specialist Output (BTC / Gold / Macro) ---
export const SpecialistOutputSchema = z.object({
  summary: z.string().describe("総括（2-3文）"),
  key_arguments: z
    .array(z.string())
    .min(3, "主要論点は最低3件必要です"),
  risks: z
    .array(z.string())
    .min(2, "リスク要因は最低2件必要です"),
  recommendation: z.enum([
    "積極採用",
    "条件付き採用",
    "見送り推奨",
    "強く反対",
  ]),
  confidence: z.number().min(0).max(1).describe("確信度 0.0-1.0"),
  confidence_rationale: z.string().describe("確信度の根拠"),
});
export type SpecialistOutput = z.infer<typeof SpecialistOutputSchema>;

// --- Risk Officer Output ---
export const RedFlagSchema = z.object({
  issue: z.string(),
  severity: z.enum(["critical", "high", "medium", "low"]),
  impact: z.string(),
});
export type RedFlag = z.infer<typeof RedFlagSchema>;

export const RiskOfficerOutputSchema = SpecialistOutputSchema.extend({
  red_flags: z
    .array(RedFlagSchema)
    .min(1, "red_flags は最低1件必要です"),
});
export type RiskOfficerOutput = z.infer<typeof RiskOfficerOutputSchema>;

// --- Chair Opening ---
export const ChairOpeningSchema = z.object({
  agenda: z.array(z.string()).min(1),
  framing: z.string(),
  key_questions: z.array(z.string()).min(1),
});
export type ChairOpening = z.infer<typeof ChairOpeningSchema>;

// --- Chair Synthesis ---
export const ChairSynthesisSchema = z.object({
  executive_summary: z.string(),
  scenarios: z.object({
    base: z.string(),
    bull: z.string(),
    bear: z.string(),
  }),
  specialist_views_summary: z.record(z.string(), z.string()),
  risk_summary: z.string(),
  proposed_allocation: z.record(z.string(), z.number()),
  reasons_not_to_act: z.array(z.string()).min(1),
  monitoring_kpis: z.array(z.string()).min(1),
});
export type ChairSynthesis = z.infer<typeof ChairSynthesisSchema>;

// --- Rebuttal Output ---
export const RebuttalOutputSchema = z.object({
  target_persona: z.string(),
  weakest_point: z.string(),
  counter_argument: z.string(),
  evidence: z.string(),
  conditions_to_change_mind: z.string(),
});
export type RebuttalOutput = z.infer<typeof RebuttalOutputSchema>;

// --- Helpers ---

/**
 * Try to parse JSON from LLM output, handling markdown code fences.
 * Returns the parsed object or null if unparseable.
 */
export function tryParseJson(raw: string): unknown {
  let cleaned = raw.trim();

  // Strategy 1: Strip markdown code fences
  const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch { /* try next strategy */ }
  }

  // Strategy 2: Find JSON object in the text
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch { /* try next strategy */ }
  }

  // Strategy 3: Direct parse
  try {
    return JSON.parse(cleaned);
  } catch {
    // Strategy 4: Extract structured data from markdown
    return extractFromMarkdown(cleaned);
  }
}

/**
 * Best-effort extraction of structured fields from markdown/text output.
 * Returns a partial object that may pass schema validation.
 */
function extractFromMarkdown(text: string): Record<string, unknown> | null {
  const result: Record<string, unknown> = {};

  // Extract summary - look for ### summary or first paragraph
  const summaryMatch = text.match(/#{1,3}\s*summary\s*\n+([\s\S]*?)(?=\n#{1,3}\s|\n---|\n\n\n)/i)
    || text.match(/総括[：:]\s*(.*)/);
  if (summaryMatch) result.summary = summaryMatch[1].trim();

  // Extract key_arguments from bullet points after "key_arguments" header
  const argSection = text.match(/#{1,3}\s*key_arguments\s*\n+([\s\S]*?)(?=\n#{1,3}\s|\n---|\n\n\n)/i);
  if (argSection) {
    const bullets = argSection[1].match(/[-*\d.]+\s+\*?\*?(.+)/g);
    if (bullets) result.key_arguments = bullets.map(b => b.replace(/^[-*\d.]+\s+\*?\*?/, "").replace(/\*?\*?$/, "").trim());
  }

  // Extract risks
  const riskSection = text.match(/#{1,3}\s*risks?\s*\n+([\s\S]*?)(?=\n#{1,3}\s|\n---|\n\n\n)/i);
  if (riskSection) {
    const bullets = riskSection[1].match(/[-*\d.]+\s+\*?\*?(.+)/g);
    if (bullets) result.risks = bullets.map(b => b.replace(/^[-*\d.]+\s+\*?\*?/, "").replace(/\*?\*?$/, "").trim());
  }

  // Extract recommendation
  const recMatch = text.match(/#{1,3}\s*recommendation\s*\n+(.+)/i)
    || text.match(/推奨[：:]\s*(.*)/);
  if (recMatch) result.recommendation = recMatch[1].trim();

  // Extract confidence
  const confMatch = text.match(/confidence[：:]\s*([\d.]+)/i)
    || text.match(/確信度[：:]\s*([\d.]+)/);
  if (confMatch) result.confidence = parseFloat(confMatch[1]);

  // Extract confidence_rationale
  const ratMatch = text.match(/confidence_rationale[：:]\s*(.*)/i)
    || text.match(/確信度の根拠[：:]\s*(.*)/);
  if (ratMatch) result.confidence_rationale = ratMatch[1].trim();

  // For rebuttals
  const targetMatch = text.match(/target_persona[：:]\s*(.*)/i)
    || text.match(/反論対象[：:]\s*(.*)/);
  if (targetMatch) result.target_persona = targetMatch[1].trim();

  const weakMatch = text.match(/weakest_point[：:]\s*(.*)/i);
  if (weakMatch) result.weakest_point = weakMatch[1].trim();

  const counterMatch = text.match(/counter_argument[：:]\s*([\s\S]*?)(?=\n#{1,3}\s|evidence|$)/i);
  if (counterMatch) result.counter_argument = counterMatch[1].trim();

  const evidenceMatch = text.match(/evidence[：:]\s*([\s\S]*?)(?=\n#{1,3}\s|conditions|$)/i);
  if (evidenceMatch) result.evidence = evidenceMatch[1].trim();

  const condMatch = text.match(/conditions_to_change_mind[：:]\s*(.*)/i);
  if (condMatch) result.conditions_to_change_mind = condMatch[1].trim();

  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Validate LLM output against a schema. Returns typed result or null with errors.
 */
export function validateOutput<T>(
  schema: z.ZodType<T>,
  raw: string,
): { data: T; errors: null } | { data: null; errors: string[] } {
  const parsed = tryParseJson(raw);
  if (parsed === null) {
    return { data: null, errors: ["LLM出力をJSONとしてパースできませんでした"] };
  }
  const result = schema.safeParse(parsed);
  if (result.success) {
    return { data: result.data, errors: null };
  }
  const errors = result.error.issues.map(
    (i) => `${i.path.join(".")}: ${i.message}`,
  );
  return { data: null, errors };
}

/**
 * Build a compressed context string from a validated specialist output.
 */
export function compressSpecialistOutput(
  personaKey: string,
  output: SpecialistOutput | RiskOfficerOutput,
): string {
  const lines = [
    `【${personaKey}】`,
    `総括: ${output.summary}`,
    `推奨: ${output.recommendation} (確信度: ${output.confidence})`,
    `根拠: ${output.confidence_rationale}`,
    `主要論点: ${output.key_arguments.join("; ")}`,
    `リスク: ${output.risks.join("; ")}`,
  ];
  if ("red_flags" in output && output.red_flags) {
    const flags = output.red_flags
      .map((f) => `[${f.severity}] ${f.issue}: ${f.impact}`)
      .join("; ");
    lines.push(`Red Flags: ${flags}`);
  }
  return lines.join("\n");
}

/**
 * Build compressed context from chair opening.
 */
export function compressChairOpening(output: ChairOpening): string {
  return [
    `【議長 開会】`,
    `議題: ${output.agenda.join("; ")}`,
    `フレーミング: ${output.framing}`,
    `主要問い: ${output.key_questions.join("; ")}`,
  ].join("\n");
}

/**
 * Estimate token count (rough: 1 token per ~2 Japanese chars or ~4 English chars).
 */
export function estimateTokens(text: string): number {
  // Count Japanese characters vs ASCII
  const jpChars = (text.match(/[\u3000-\u9fff\uf900-\ufaff]/g) || []).length;
  const otherChars = text.length - jpChars;
  return Math.ceil(jpChars / 2 + otherChars / 4);
}
