import { NextRequest, NextResponse } from "next/server";
import { runsCollection, runStepsCollection, casesCollection } from "@/lib/firebase/collections";
import { PERSONA_ROLE_LABELS } from "@/lib/ai/personas";
import { PersonaRole, StepType } from "@/lib/types";

const STEP_LABELS: Record<StepType, string> = {
  chair_opening: "論点定義",
  specialist_view: "一次意見",
  rebuttal: "相互反論",
  risk_assessment: "リスク評価",
  chair_synthesis: "最終統合",
  final_report: "最終レポート",
};

function formatOutput(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "string") return parsed;
    return "```json\n" + JSON.stringify(parsed, null, 2) + "\n```";
  } catch {
    return raw;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const full = request.nextUrl.searchParams.get("full") === "true";

  const runDoc = await runsCollection().doc(id).get();
  if (!runDoc.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const runData = runDoc.data()!;

  if (!full) {
    // Original: final report only
    const markdown = runData.markdownReport ?? "# レポートが見つかりません";
    return new NextResponse(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="report-${id}.md"`,
      },
    });
  }

  // Full export: case info + all steps + final report
  const caseDoc = await casesCollection().doc(runData.caseId).get();
  const caseData = caseDoc.exists ? caseDoc.data()! : {};

  const stepsSnap = await runStepsCollection(id).orderBy("startedAt").get();
  const steps = stepsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  let md = `# 投資委員会 審議記録（完全版）\n\n`;
  md += `**ケース名:** ${caseData.name ?? "-"}\n`;
  md += `**企業名:** ${caseData.companyName ?? "-"}\n`;
  md += `**実行日時:** ${runData.startedAt ? new Date(runData.startedAt).toLocaleString("ja-JP") : "-"}\n`;
  md += `**ステータス:** ${runData.status}\n\n`;
  md += `---\n\n`;

  // Case details
  md += `## ケース概要\n\n`;
  md += `| 項目 | 値 |\n|------|----|\n`;
  md += `| 管轄 | ${caseData.jurisdiction ?? "-"} |\n`;
  md += `| 現預金 | $${(caseData.cashUsd ?? 0).toLocaleString()} |\n`;
  md += `| 時価総額 | $${(caseData.marketCapUsd ?? 0).toLocaleString()} |\n`;
  md += `| 純有利子負債 | $${(caseData.netDebtUsd ?? 0).toLocaleString()} |\n`;
  md += `| トレジャリー目的 | ${caseData.treasuryObjective ?? "-"} |\n`;
  md += `| 候補資産 | ${(caseData.candidateAssets ?? []).join(", ")} |\n`;
  md += `| 最大許容DD | ${((caseData.maxDrawdown ?? 0) * 100).toFixed(0)}% |\n`;
  md += `| 最小流動性確保 | ${caseData.minLiquidityMonths ?? "-"}ヶ月 |\n\n`;

  // Each step
  md += `## 審議プロセス\n\n`;

  for (const step of steps) {
    const s = step as Record<string, unknown>;
    const personaLabel = PERSONA_ROLE_LABELS[s.personaKey as PersonaRole] ?? String(s.personaKey);
    const stepLabel = STEP_LABELS[s.stepType as StepType] ?? String(s.stepType);

    md += `### ${personaLabel} - ${stepLabel}\n\n`;

    if (s.outputJson) {
      md += formatOutput(String(s.outputJson));
      md += `\n\n`;
    } else if (s.errorMessage) {
      md += `> エラー: ${s.errorMessage}\n\n`;
    } else {
      md += `_出力なし_\n\n`;
    }
  }

  // Final report
  if (runData.markdownReport) {
    md += `---\n\n`;
    md += `## 最終レポート\n\n`;
    md += runData.markdownReport;
  }

  return new NextResponse(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="full-report-${id}.md"`,
    },
  });
}
