"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useCase } from "@/hooks/use-cases";
import { useRunLauncher, useLatestRun } from "@/hooks/use-run";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PERSONA_ROLE_LABELS } from "@/lib/ai/personas";
import { PersonaRole, RunStep, StepType } from "@/lib/types";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const STEP_LABELS: Record<StepType, string> = {
  chair_opening: "論点定義",
  specialist_view: "一次意見",
  rebuttal: "相互反論",
  risk_assessment: "リスク評価",
  chair_synthesis: "最終統合",
  final_report: "レポート整形",
};

const STATUS_LABELS: Record<string, string> = {
  completed: "完了",
  running: "実行中",
  pending: "待機中",
  failed: "失敗",
};

export default function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { caseData, isLoading, deleteCase } = useCase(id);
  const { launching, startRun } = useRunLauncher();
  const { run, steps, isRunning, mutate } = useLatestRun(id);

  const handleDelete = async () => {
    if (!confirm("このケースを削除しますか？")) return;
    try {
      await deleteCase();
      toast.success("ケースを削除しました");
      router.push("/cases");
    } catch {
      toast.error("削除に失敗しました");
    }
  };

  const handleStartRun = async () => {
    try {
      await startRun(id);
      toast.success("審議を開始しました");
      mutate();
    } catch {
      toast.error("審議の開始に失敗しました");
    }
  };

  if (isLoading) return <p className="text-muted-foreground">読み込み中...</p>;
  if (!caseData) return <p className="text-destructive">ケースが見つかりません</p>;

  const completedSteps = steps.filter((s: RunStep) => s.status === "completed").length;
  const totalSteps = steps.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{caseData.name}</h2>
          <p className="text-muted-foreground">{caseData.companyName}</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleStartRun}
            disabled={launching || isRunning}
          >
            {launching ? "開始中..." : isRunning ? "審議中..." : "審議開始"}
          </Button>
          <Button variant="outline" onClick={handleDelete}>
            削除
          </Button>
        </div>
      </div>

      <Tabs defaultValue={run ? "run" : "details"}>
        <TabsList>
          <TabsTrigger value="details">詳細</TabsTrigger>
          <TabsTrigger value="run">
            審議結果
            {isRunning && (
              <Badge variant="secondary" className="ml-2">
                {completedSteps}/{totalSteps}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>現預金</CardDescription>
                <CardTitle>${caseData.cashUsd?.toLocaleString()}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>時価総額</CardDescription>
                <CardTitle>${caseData.marketCapUsd?.toLocaleString()}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>純有利子負債</CardDescription>
                <CardTitle>${caseData.netDebtUsd?.toLocaleString()}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-3">
              <div>
                <span className="text-sm text-muted-foreground">管轄:</span>{" "}
                {caseData.jurisdiction || "-"}
              </div>
              <div>
                <span className="text-sm text-muted-foreground">トレジャリー目的:</span>{" "}
                {caseData.treasuryObjective || "-"}
              </div>
              <div>
                <span className="text-sm text-muted-foreground">候補資産:</span>{" "}
                <span className="flex flex-wrap gap-1 mt-1">
                  {caseData.candidateAssets.map((a) => (
                    <Badge key={a} variant="secondary">{a}</Badge>
                  ))}
                </span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">最大許容ドローダウン:</span>{" "}
                {(caseData.maxDrawdown * 100).toFixed(0)}%
              </div>
              <div>
                <span className="text-sm text-muted-foreground">最小流動性確保期間:</span>{" "}
                {caseData.minLiquidityMonths}ヶ月
              </div>
              {caseData.notes && (
                <div>
                  <span className="text-sm text-muted-foreground">備考:</span>{" "}
                  {caseData.notes}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="run" className="space-y-4">
          {!run && !launching && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">まだ審議が実行されていません</p>
                <Button onClick={handleStartRun}>審議開始</Button>
              </CardContent>
            </Card>
          )}

          {run && (isRunning || run.status === "completed" || run.status === "failed") && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {isRunning ? "審議進行中" : run.status === "completed" ? "審議完了" : "審議失敗"}
                  </CardTitle>
                  <Badge variant={isRunning ? "secondary" : run.status === "completed" ? "default" : "destructive"}>
                    {isRunning ? `${completedSteps}/${totalSteps} ステップ完了` : run.status === "completed" ? "完了" : "失敗"}
                  </Badge>
                </div>
                {run.startedAt && (
                  <CardDescription>
                    開始: {new Date(run.startedAt).toLocaleString("ja-JP")}
                    {run.completedAt && ` / 完了: ${new Date(run.completedAt).toLocaleString("ja-JP")}`}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {steps.map((step: RunStep) => (
                    <StepItem key={step.id} step={step} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {run?.status === "completed" && run.markdownReport && (
            <div className="space-y-4">
              <div className="flex justify-end gap-2">
                <a href={`/api/runs/${run.id}/export?full=true`} download className={cn(buttonVariants({ variant: "outline" }))}>
                  完全版エクスポート
                </a>
                <a href={`/api/runs/${run.id}/export`} download className={cn(buttonVariants({ variant: "outline" }))}>
                  レポートのみ
                </a>
              </div>
              <Card>
                <CardContent className="pt-6 prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {run.markdownReport}
                  </ReactMarkdown>
                </CardContent>
              </Card>
            </div>
          )}

          {run?.status === "failed" && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <p className="text-destructive">エラー: {run.errorMessage}</p>
                <Button onClick={handleStartRun} className="mt-4">再実行</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StepItem({ step }: { step: RunStep }) {
  const [open, setOpen] = useState(false);
  const hasOutput = step.status === "completed" && step.outputJson;

  function formatOutput(raw: string): string {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "string") return parsed;
      return JSON.stringify(parsed, null, 2);
    } catch {
      return raw;
    }
  }

  return (
    <div className="border rounded-lg">
      <button
        type="button"
        onClick={() => hasOutput && setOpen(!open)}
        className={`flex items-center gap-3 py-2 px-3 w-full text-left ${hasOutput ? "cursor-pointer hover:bg-accent" : ""}`}
      >
        <div className={`h-2 w-2 rounded-full shrink-0 ${
          step.status === "completed" ? "bg-green-500" :
          step.status === "running" ? "bg-yellow-500 animate-pulse" :
          step.status === "failed" ? "bg-red-500" :
          "bg-gray-300"
        }`} />
        <Badge variant={step.status === "completed" ? "default" : step.status === "running" ? "secondary" : "outline"} className="w-16 justify-center text-xs shrink-0">
          {STATUS_LABELS[step.status] ?? step.status}
        </Badge>
        <span className="text-sm font-medium">
          {PERSONA_ROLE_LABELS[step.personaKey as PersonaRole] ?? step.personaKey}
        </span>
        <span className="text-xs text-muted-foreground">
          {STEP_LABELS[step.stepType as StepType] ?? step.stepType}
        </span>
        {hasOutput && (
          <span className="text-xs text-muted-foreground ml-auto">{open ? "▼" : "▶"}</span>
        )}
      </button>
      {open && hasOutput && (
        <div className="px-3 pb-3 border-t">
          <pre className="text-xs whitespace-pre-wrap bg-muted p-3 rounded mt-2 max-h-96 overflow-y-auto">
            {formatOutput(step.outputJson!)}
          </pre>
        </div>
      )}
    </div>
  );
}
