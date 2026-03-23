import { NextResponse } from "next/server";
import { runsCollection, casesCollection, personasCollection, runStepsCollection, settingsCollection } from "@/lib/firebase/collections";
import { runCreateSchema } from "@/lib/schemas";
import { createLLMClient } from "@/lib/ai/llm-client";
import { Case, PersonaConfig, ModelSettings, RunStep } from "@/lib/types";

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

async function executeRun(runId: string, caseData: Case) {
  const runRef = runsCollection().doc(runId);
  await runRef.update({ status: "running" });

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

    const caseContext = `企業名: ${caseData.companyName}
管轄: ${caseData.jurisdiction}
現預金: $${caseData.cashUsd.toLocaleString()}
時価総額: $${caseData.marketCapUsd.toLocaleString()}
純有利子負債: $${caseData.netDebtUsd.toLocaleString()}
トレジャリー目的: ${caseData.treasuryObjective}
候補資産: ${caseData.candidateAssets.join(", ")}
最小流動性確保期間: ${caseData.minLiquidityMonths}ヶ月
最大許容ドローダウン: ${(caseData.maxDrawdown * 100).toFixed(0)}%
デリバティブ許可: ${caseData.derivativesAllowed ? "はい" : "いいえ"}
現物限定: ${caseData.physicalOnly ? "はい" : "いいえ"}
備考: ${caseData.notes}`;

    const allOutputs: Record<string, string> = {};

    // Step 1: Chair opening
    if (chair) {
      const step = await createStep(runId, "chair_opening", "chair");
      const res = await getLlmForPersona(chair).complete(chair.systemPrompt, `以下のケースについて論点を定義してください:\n${caseContext}`);
      allOutputs["chair_opening"] = res.content;
      await completeStep(runId, step.id, res.content);
    }

    // Step 2: Specialist views
    for (const persona of specialists) {
      const step = await createStep(runId, "specialist_view", persona.key);
      const res = await getLlmForPersona(persona).complete(
        persona.systemPrompt,
        `以下のケースについて専門的見解を述べてください:\n${caseContext}\n\n議長の論点:\n${allOutputs["chair_opening"] ?? ""}`
      );
      allOutputs[`specialist_${persona.key}`] = res.content;
      await completeStep(runId, step.id, res.content);
    }

    // Step 3: Rebuttals
    for (const persona of specialists) {
      const step = await createStep(runId, "rebuttal", persona.key);
      const othersViews = Object.entries(allOutputs)
        .filter(([k]) => k.startsWith("specialist_") && !k.includes(persona.key))
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n\n");
      const res = await getLlmForPersona(persona).complete(
        persona.systemPrompt,
        `他の専門家の見解に対して反論・補足してください:\n${othersViews}`
      );
      allOutputs[`rebuttal_${persona.key}`] = res.content;
      await completeStep(runId, step.id, res.content);
    }

    // Step 4: Risk assessment
    const riskOfficer = personas.find((p) => p.key === "risk_officer");
    if (riskOfficer) {
      const step = await createStep(runId, "risk_assessment", "risk_officer");
      const allViews = Object.entries(allOutputs)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n\n");
      const res = await getLlmForPersona(riskOfficer).complete(
        riskOfficer.systemPrompt,
        `全体の議論を踏まえ、red flagsを整理してください:\n${allViews}`
      );
      allOutputs["risk_assessment"] = res.content;
      await completeStep(runId, step.id, res.content);
    }

    // Step 5: Chair synthesis
    if (chair) {
      const step = await createStep(runId, "chair_synthesis", "chair");
      const allViews = Object.entries(allOutputs)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n\n");
      const res = await getLlmForPersona(chair).complete(
        chair.systemPrompt,
        `全専門家の見解・反論・リスク評価を統合し、最終提案を作成してください:\n${caseContext}\n\n${allViews}`
      );
      allOutputs["chair_synthesis"] = res.content;
      await completeStep(runId, step.id, res.content);
    }

    // Step 6: Editor final report
    if (editor) {
      const step = await createStep(runId, "final_report", "editor");
      const allContent = Object.entries(allOutputs)
        .map(([k, v]) => `## ${k}\n${v}`)
        .join("\n\n");
      const res = await getLlmForPersona(editor).complete(
        editor.systemPrompt,
        `以下の審議内容を最終レポートに整形してください:\n\nケース情報:\n${caseContext}\n\n${allContent}`
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
  } catch (error) {
    await runRef.update({
      status: "failed",
      completedAt: new Date().toISOString(),
      errorMessage: error instanceof Error ? error.message : "Unknown error",
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
