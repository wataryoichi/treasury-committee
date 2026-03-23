import { NextResponse } from "next/server";
import { runsCollection, casesCollection, personasCollection, runStepsCollection, settingsCollection } from "@/lib/firebase/collections";
import { runCreateSchema } from "@/lib/schemas";
import { createLLMClient } from "@/lib/ai/llm-client";
import { Case, PersonaConfig, ModelSettings, RunStep } from "@/lib/types";
import { buildEnrichedCaseContext } from "@/lib/ai/case-analysis";
import {
  SpecialistOutputSchema,
  RiskOfficerOutputSchema,
  ChairOpeningSchema,
  ChairSynthesisSchema,
  RebuttalOutputSchema,
  validateOutput,
  compressSpecialistOutput,
  compressChairOpening,
  estimateTokens,
  type SpecialistOutput,
  type RiskOfficerOutput,
  type ChairOpening,
} from "@/lib/ai/output-schemas";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = runCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Verify case exists
  const caseDoc = await casesCollection().doc(parsed.data.caseId).get();
  if (!caseDoc.exists) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const runRef = await runsCollection().add({
    caseId: parsed.data.caseId,
    status: "pending",
    startedAt: now,
  });

  // Fire and forget the orchestration
  executeRun(runRef.id, { id: caseDoc.id, ...caseDoc.data() } as Case).catch(
    console.error
  );

  return NextResponse.json({ id: runRef.id }, { status: 201 });
}

// --- Rebuttal pairing configuration ---
const REBUTTAL_PAIRINGS: Record<string, string[]> = {
  bitcoin_strategist: ["gold_strategist", "risk_officer"],
  gold_strategist: ["bitcoin_strategist", "risk_officer"],
  macro_strategist: ["bitcoin_strategist", "gold_strategist", "risk_officer"],
  risk_officer: ["bitcoin_strategist", "gold_strategist"],
};

const CONTEXT_TOKEN_WARNING_THRESHOLD = 80_000;

async function executeRun(runId: string, caseData: Case) {
  const runRef = runsCollection().doc(runId);
  await runRef.update({ status: "running" });

  const allOutputs: Record<string, string> = {};

  try {
    // Load model settings
    const settingsDoc = await settingsCollection().doc("model").get();
    const modelSettings = settingsDoc.exists
      ? ({ id: settingsDoc.id, ...settingsDoc.data() } as ModelSettings)
      : { id: "model", provider: "dummy" as const, apiKey: "", model: "dummy", baseUrl: "", temperature: 0.5, maxTokens: 4096, updatedAt: "" };
    const defaultLlm = createLLMClient(modelSettings);

    // Create per-persona LLM client (uses modelOverride if set and provider is openrouter)
    function getLlmForPersona(persona: PersonaConfig) {
      if (persona.modelOverride && modelSettings.provider === "openrouter") {
        return createLLMClient({ ...modelSettings, model: persona.modelOverride });
      }
      return defaultLlm;
    }

    // Load all personas, then filter/sort in code to avoid composite index
    const personaSnap = await personasCollection().get();
    if (personaSnap.empty) {
      // Seed personas first by calling the personas API
      const { DEFAULT_PERSONAS } = await import("@/lib/ai/personas");
      const batch = personasCollection().firestore.batch();
      const now = new Date().toISOString();
      for (const p of DEFAULT_PERSONAS) {
        batch.set(personasCollection().doc(p.key), { ...p, createdAt: now, updatedAt: now });
      }
      await batch.commit();
    }
    const allPersonaSnap = personaSnap.empty
      ? await personasCollection().get()
      : personaSnap;
    const personas = (allPersonaSnap.docs
      .map((d) => ({ id: d.id, ...d.data() })) as PersonaConfig[])
      .filter((p) => p.enabled)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const chair = personas.find((p) => p.key === "chair");
    const specialists = personas.filter(
      (p) => p.key !== "chair" && p.key !== "editor"
    );
    const editor = personas.find((p) => p.key === "editor");

    // Item 1: Enriched case context with pre-analysis metrics
    const caseContext = buildEnrichedCaseContext(caseData);

    // Stores for compressed outputs (for context passing)
    const compressedOutputs: Record<string, string> = {};
    let totalPromptTokens = 0;

    function trackTokens(text: string) {
      const tokens = estimateTokens(text);
      totalPromptTokens += tokens;
      if (totalPromptTokens > CONTEXT_TOKEN_WARNING_THRESHOLD) {
        console.warn(
          `[Run ${runId}] Cumulative prompt token estimate: ~${totalPromptTokens} (exceeds ${CONTEXT_TOKEN_WARNING_THRESHOLD} threshold)`
        );
      }
    }

    // Step 1: Chair opening
    let chairOpeningCompressed = "";
    if (chair) {
      const step = await createStep(runId, "chair_opening", "chair");
      const userMsg = `以下のケースについて論点を定義してください:\n${caseContext}`;
      trackTokens(chair.systemPrompt + userMsg);
      const res = await getLlmForPersona(chair).complete(chair.systemPrompt, userMsg);
      allOutputs["chair_opening"] = res.content;

      // Item 5: Validate and compress chair opening
      const validated = validateOutput(ChairOpeningSchema, res.content);
      if (validated.data) {
        chairOpeningCompressed = compressChairOpening(validated.data);
      } else {
        // Fallback: use raw but truncated
        chairOpeningCompressed = `【議長 開会】\n${res.content.slice(0, 500)}`;
      }
      compressedOutputs["chair_opening"] = chairOpeningCompressed;

      await completeStep(runId, step.id, res.content);
    }

    // Step 2: Specialist views (including risk_officer initial view)
    const specialistParsed: Record<string, SpecialistOutput | RiskOfficerOutput> = {};

    for (const persona of specialists) {
      const step = await createStep(runId, "specialist_view", persona.key);
      const userMsg = `以下のケースについて専門的見解を述べてください:\n${caseContext}\n\n議長の論点:\n${chairOpeningCompressed}`;
      trackTokens(persona.systemPrompt + userMsg);
      const res = await getLlmForPersona(persona).complete(
        persona.systemPrompt,
        userMsg,
      );
      allOutputs[`specialist_${persona.key}`] = res.content;

      // Item 3 & 5: Validate output and build compressed context
      const schema = persona.key === "risk_officer" ? RiskOfficerOutputSchema : SpecialistOutputSchema;
      const validated = validateOutput(schema, res.content);
      if (validated.data) {
        specialistParsed[persona.key] = validated.data as SpecialistOutput | RiskOfficerOutput;
        compressedOutputs[`specialist_${persona.key}`] = compressSpecialistOutput(
          persona.key,
          validated.data as SpecialistOutput | RiskOfficerOutput,
        );
      } else {
        // Fallback: store truncated raw output
        console.warn(
          `[Run ${runId}] ${persona.key} output validation failed:`,
          validated.errors,
        );
        compressedOutputs[`specialist_${persona.key}`] = `【${persona.key}】\n${res.content.slice(0, 500)}`;
      }

      await completeStep(runId, step.id, res.content);
    }

    // Step 3: Rebuttals - Item 4: Redesigned with specific pairings
    for (const persona of specialists) {
      const step = await createStep(runId, "rebuttal", persona.key);

      // Determine rebuttal targets
      const targets = REBUTTAL_PAIRINGS[persona.key] ?? [];
      const targetViews = targets
        .filter((t) => compressedOutputs[`specialist_${t}`])
        .map((t) => compressedOutputs[`specialist_${t}`])
        .join("\n\n");

      const rebuttalInstructions = `あなたは ${persona.key} の専門家です。以下の他の専門家の見解を読み、反論してください。

## 反論の指示
1. 対象とする専門家の見解の中で **最も弱い論点** を1つ特定してください
2. その論点に対してエビデンスに基づく反論を行ってください
3. あなたの推奨を変更する条件を明示してください

## 対象となる見解:
${targetViews}

## ケース情報:
${caseContext}

## 出力形式（必ず以下のJSON形式で出力）
{
  "target_persona": "反論対象の専門家名",
  "weakest_point": "最も弱い論点",
  "counter_argument": "エビデンスに基づく反論",
  "evidence": "反論の根拠となるデータ・事実",
  "conditions_to_change_mind": "自分の推奨を変更する条件"
}`;

      trackTokens(persona.systemPrompt + rebuttalInstructions);
      const res = await getLlmForPersona(persona).complete(
        persona.systemPrompt,
        rebuttalInstructions,
      );
      allOutputs[`rebuttal_${persona.key}`] = res.content;

      // Validate and compress rebuttal
      const validated = validateOutput(RebuttalOutputSchema, res.content);
      if (validated.data) {
        compressedOutputs[`rebuttal_${persona.key}`] = `【${persona.key} 反論】→ ${validated.data.target_persona}: ${validated.data.counter_argument} (変更条件: ${validated.data.conditions_to_change_mind})`;
      } else {
        compressedOutputs[`rebuttal_${persona.key}`] = `【${persona.key} 反論】\n${res.content.slice(0, 300)}`;
      }

      await completeStep(runId, step.id, res.content);
    }

    // Step 4: Risk assessment (dedicated pass after rebuttals)
    const riskOfficer = personas.find((p) => p.key === "risk_officer");
    if (riskOfficer) {
      const step = await createStep(runId, "risk_assessment", "risk_officer");

      // Build compressed context from all prior steps
      const compressedContext = Object.entries(compressedOutputs)
        .map(([k, v]) => `## ${k}\n${v}`)
        .join("\n\n");

      const riskMsg = `全体の議論を踏まえ、最終的なリスク評価とred_flagsを整理してください。
これは反論ラウンド後の最終評価です。全専門家の見解と反論を考慮してください。

## 圧縮済み議論コンテキスト:
${compressedContext}

## ケース情報:
${caseContext}`;

      trackTokens(riskOfficer.systemPrompt + riskMsg);
      const res = await getLlmForPersona(riskOfficer).complete(
        riskOfficer.systemPrompt,
        riskMsg,
      );
      allOutputs["risk_assessment"] = res.content;

      const validated = validateOutput(RiskOfficerOutputSchema, res.content);
      if (validated.data) {
        compressedOutputs["risk_assessment"] = compressSpecialistOutput("risk_officer_final", validated.data);
      } else {
        compressedOutputs["risk_assessment"] = `【リスク最終評価】\n${res.content.slice(0, 500)}`;
      }

      await completeStep(runId, step.id, res.content);
    }

    // Step 5: Chair synthesis - Item 5: Uses compressed context, not raw
    if (chair) {
      const step = await createStep(runId, "chair_synthesis", "chair");

      const compressedContext = Object.entries(compressedOutputs)
        .map(([k, v]) => `## ${k}\n${v}`)
        .join("\n\n");

      const synthesisMsg = `全専門家の見解・反論・リスク評価を統合し、最終提案をJSON形式で作成してください。

## ケース情報:
${caseContext}

## 専門家見解・反論・リスク評価（圧縮サマリー）:
${compressedContext}

統合フェーズの手順に従い、JSONで出力してください。executive_summaryは「取締役会向け1スライド」として正確に3文で記述すること。`;

      trackTokens(chair.systemPrompt + synthesisMsg);
      const res = await getLlmForPersona(chair).complete(
        chair.systemPrompt,
        synthesisMsg,
      );
      allOutputs["chair_synthesis"] = res.content;

      // Validate chair synthesis
      const validated = validateOutput(ChairSynthesisSchema, res.content);
      if (validated.errors) {
        console.warn(`[Run ${runId}] Chair synthesis validation failed:`, validated.errors);
      }

      await completeStep(runId, step.id, res.content);
    }

    // Step 6: Editor final report - passes both compressed and raw for completeness
    if (editor) {
      const step = await createStep(runId, "final_report", "editor");

      // For editor, pass compressed summaries for structure + raw chair synthesis for detail
      const compressedContext = Object.entries(compressedOutputs)
        .map(([k, v]) => `## ${k}\n${v}`)
        .join("\n\n");

      const editorMsg = `以下の審議内容を最終レポートに整形してください。固定テンプレートに厳密に従ってください。

## ケース情報:
${caseContext}

## 専門家見解サマリー:
${compressedContext}

## 議長統合案（詳細）:
${allOutputs["chair_synthesis"] ?? ""}

## リスク評価（詳細）:
${allOutputs["risk_assessment"] ?? ""}`;

      trackTokens(editor.systemPrompt + editorMsg);
      const res = await getLlmForPersona(editor).complete(
        editor.systemPrompt,
        editorMsg,
      );
      allOutputs["final_report"] = res.content;
      await completeStep(runId, step.id, res.content);

      await runRef.update({
        status: "completed",
        completedAt: new Date().toISOString(),
        markdownReport: res.content,
        rawOutputJson: JSON.stringify(allOutputs),
        summary: "審議完了",
      });
    } else {
      await runRef.update({
        status: "completed",
        completedAt: new Date().toISOString(),
        rawOutputJson: JSON.stringify(allOutputs),
        summary: "審議完了（エディターなし）",
      });
    }

    console.log(`[Run ${runId}] Completed. Estimated total prompt tokens: ~${totalPromptTokens}`);
  } catch (error) {
    // Save partial results even on failure
    const partialReport = Object.keys(allOutputs).length > 0
      ? Object.entries(allOutputs).map(([k, v]) => `## ${k}\n${v}`).join("\n\n")
      : undefined;
    await runRef.update({
      status: "failed",
      completedAt: new Date().toISOString(),
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      rawOutputJson: JSON.stringify(allOutputs),
      ...(partialReport ? { markdownReport: `# 審議中断（部分結果）\n\nエラー: ${error instanceof Error ? error.message : "Unknown"}\n\n---\n\n${partialReport}` } : {}),
    });
  }
}

async function createStep(
  runId: string,
  stepType: RunStep["stepType"],
  personaKey: string
): Promise<{ id: string }> {
  const now = new Date().toISOString();
  const ref = await runStepsCollection(runId).add({
    runId,
    stepType,
    personaKey,
    status: "running",
    startedAt: now,
  });
  return { id: ref.id };
}

async function completeStep(runId: string, stepId: string, output: string) {
  await runStepsCollection(runId).doc(stepId).update({
    status: "completed",
    completedAt: new Date().toISOString(),
    outputJson: output,
  });
}
