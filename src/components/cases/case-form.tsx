"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { caseSchema, CaseFormValues } from "@/lib/schemas";
import { CANDIDATE_ASSETS } from "@/lib/ai/personas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";

interface CaseFormProps {
  defaultValues?: Partial<CaseFormValues>;
  onSubmit: (values: CaseFormValues) => Promise<void>;
  submitLabel?: string;
}

export function CaseForm({ defaultValues, onSubmit, submitLabel = "作成" }: CaseFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CaseFormValues>({
    resolver: zodResolver(caseSchema),
    defaultValues: {
      name: "",
      companyName: "",
      jurisdiction: "",
      cashUsd: 0,
      marketCapUsd: 0,
      netDebtUsd: 0,
      treasuryObjective: "",
      candidateAssets: ["BTC", "Gold", "Cash"],
      minLiquidityMonths: 6,
      maxDrawdown: 0.2,
      derivativesAllowed: false,
      physicalOnly: false,
      notes: "",
      ...defaultValues,
    },
  });

  const candidateAssets = watch("candidateAssets");
  const derivativesAllowed = watch("derivativesAllowed");
  const physicalOnly = watch("physicalOnly");

  const toggleAsset = (asset: string) => {
    const current = candidateAssets ?? [];
    if (current.includes(asset)) {
      setValue(
        "candidateAssets",
        current.filter((a) => a !== asset),
        { shouldValidate: true }
      );
    } else {
      setValue("candidateAssets", [...current, asset], { shouldValidate: true });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">ケース名 *</Label>
              <Input id="name" {...register("name")} placeholder="例: 2024年Q4 BTC検討" />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">企業名 *</Label>
              <Input id="companyName" {...register("companyName")} placeholder="例: Sample Corp" />
              {errors.companyName && <p className="text-sm text-destructive">{errors.companyName.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="jurisdiction">管轄 / Jurisdiction</Label>
            <Input id="jurisdiction" {...register("jurisdiction")} placeholder="例: Japan / US / Cayman" />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="cashUsd">現預金 (USD)</Label>
              <Input id="cashUsd" type="number" {...register("cashUsd", { valueAsNumber: true })} />
              {errors.cashUsd && <p className="text-sm text-destructive">{errors.cashUsd.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="marketCapUsd">時価総額 (USD)</Label>
              <Input id="marketCapUsd" type="number" {...register("marketCapUsd", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="netDebtUsd">純有利子負債 (USD)</Label>
              <Input id="netDebtUsd" type="number" {...register("netDebtUsd", { valueAsNumber: true })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="treasuryObjective">トレジャリー目的</Label>
            <Textarea
              id="treasuryObjective"
              {...register("treasuryObjective")}
              placeholder="例: 余剰現預金の購買力保全、インフレヘッジ"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <Label>候補資産 *</Label>
          <div className="flex flex-wrap gap-2">
            {CANDIDATE_ASSETS.map((asset) => (
              <button
                key={asset}
                type="button"
                onClick={() => toggleAsset(asset)}
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium border transition-colors ${
                  candidateAssets?.includes(asset)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-accent border-input"
                }`}
              >
                {asset}
              </button>
            ))}
          </div>
          {errors.candidateAssets && (
            <p className="text-sm text-destructive">{errors.candidateAssets.message}</p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="minLiquidityMonths">最小流動性確保期間（月）</Label>
              <Input
                id="minLiquidityMonths"
                type="number"
                {...register("minLiquidityMonths", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxDrawdown">最大許容ドローダウン (0-1)</Label>
              <Input
                id="maxDrawdown"
                type="number"
                step="0.01"
                {...register("maxDrawdown", { valueAsNumber: true })}
              />
              {errors.maxDrawdown && <p className="text-sm text-destructive">{errors.maxDrawdown.message}</p>}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                checked={derivativesAllowed}
                onCheckedChange={(v) => setValue("derivativesAllowed", v)}
              />
              <Label>デリバティブ許可</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={physicalOnly}
                onCheckedChange={(v) => setValue("physicalOnly", v)}
              />
              <Label>現物限定</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="notes">備考</Label>
            <Textarea id="notes" {...register("notes")} rows={3} />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "処理中..." : submitLabel}
      </Button>
    </form>
  );
}
