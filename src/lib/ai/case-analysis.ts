import { Case } from "@/lib/types";

export interface CaseAnalysis {
  cashToMarketCapRatio: number;
  cashToDebtRatio: number | null; // null if netDebt <= 0
  maxLossAtDrawdown: number;
  minCashRequired: number;
  availableForInvestment: number;
}

export function analyzeCaseData(caseData: Case): CaseAnalysis {
  const cashToMarketCapRatio =
    caseData.marketCapUsd > 0 ? caseData.cashUsd / caseData.marketCapUsd : 0;

  // 純有利子負債が正の場合のみ算出
  const cashToDebtRatio =
    caseData.netDebtUsd > 0 ? caseData.cashUsd / caseData.netDebtUsd : null;

  const maxLossAtDrawdown = caseData.cashUsd * caseData.maxDrawdown;

  // 月次バーンレート推定: cashUsd / minLiquidityMonths で最低限確保すべき現金
  const minCashRequired =
    caseData.minLiquidityMonths > 0
      ? caseData.cashUsd / caseData.minLiquidityMonths * caseData.minLiquidityMonths
      : 0;
  // 上の式は意図的: 最小流動性確保期間分の現金をそのまま確保
  // つまり minCashRequired = cashUsd の場合、投資可能額は0になる
  // より実用的な推定: 月次運転資金 = cashUsd / minLiquidityMonths (バーンレート推定)
  // minCashRequired = バーンレート * minLiquidityMonths = 全額 となり意味がないので、
  // 代わりに: 運転資金は「総現金の一定割合」として minLiquidityMonths に基づくヒューリスティクスを使う
  // 実際の推定: バーンレートは不明なので、minLiquidityMonths を確保すべき最小月数と見て
  // 全体の何割を確保すべきか = min(minLiquidityMonths / 24, 1.0) (24ヶ月を基準)

  const liquidityReserveRatio = Math.min(caseData.minLiquidityMonths / 24, 1.0);
  const estimatedMinCash = caseData.cashUsd * liquidityReserveRatio;
  const availableForInvestment = Math.max(caseData.cashUsd - estimatedMinCash, 0);

  return {
    cashToMarketCapRatio,
    cashToDebtRatio,
    maxLossAtDrawdown,
    minCashRequired: estimatedMinCash,
    availableForInvestment,
  };
}

export function formatCaseAnalysis(caseData: Case, analysis: CaseAnalysis): string {
  const fmt = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

  return `--- 事前分析メトリクス ---
現預金/時価総額比率: ${pct(analysis.cashToMarketCapRatio)}
現預金/純有利子負債比率: ${analysis.cashToDebtRatio !== null ? `${analysis.cashToDebtRatio.toFixed(2)}x` : "N/A（純有利子負債ゼロ以下）"}
候補資産を最大DD保有した場合の最大損失額: ${fmt(analysis.maxLossAtDrawdown)} (= 現預金 ${fmt(caseData.cashUsd)} x 最大DD ${pct(caseData.maxDrawdown)})
最小流動性確保に必要な現金: ${fmt(analysis.minCashRequired)} (${caseData.minLiquidityMonths}ヶ月 / 24ヶ月基準)
投資可能額（推定）: ${fmt(analysis.availableForInvestment)}
--- /事前分析メトリクス ---`;
}

export function buildEnrichedCaseContext(caseData: Case): string {
  const analysis = analyzeCaseData(caseData);

  const baseContext = `企業名: ${caseData.companyName}
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
備考: ${caseData.notes}

${formatCaseAnalysis(caseData, analysis)}`;

  return baseContext;
}
