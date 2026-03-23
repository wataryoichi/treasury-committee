import { ModelSettings } from "@/lib/types";

export interface LLMResponse {
  content: string;
  usage?: { promptTokens: number; completionTokens: number };
}

export interface LLMClient {
  complete(
    systemPrompt: string,
    userMessage: string,
    temperature?: number
  ): Promise<LLMResponse>;
}

export class OpenRouterClient implements LLMClient {
  constructor(
    private apiKey: string,
    private model: string,
    private defaultTemperature: number = 0.5,
    private maxTokens: number = 4096
  ) {}

  async complete(
    systemPrompt: string,
    userMessage: string,
    temperature?: number
  ): Promise<LLMResponse> {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://treasury-committee.app",
        "X-Title": "Treasury Committee",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: temperature ?? this.defaultTemperature,
        max_tokens: this.maxTokens,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenRouter API error (${res.status}): ${err}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    if (!choice) throw new Error("No response from OpenRouter");

    return {
      content: choice.message.content,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
          }
        : undefined,
    };
  }
}

export class AnthropicClient implements LLMClient {
  constructor(
    private apiKey: string,
    private model: string,
    private defaultTemperature: number = 0.5,
    private maxTokens: number = 4096
  ) {}

  async complete(
    systemPrompt: string,
    userMessage: string,
    temperature?: number
  ): Promise<LLMResponse> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: this.maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
        temperature: temperature ?? this.defaultTemperature,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic API error (${res.status}): ${err}`);
    }

    const data = await res.json();
    return {
      content: data.content?.[0]?.text ?? "",
      usage: data.usage
        ? {
            promptTokens: data.usage.input_tokens,
            completionTokens: data.usage.output_tokens,
          }
        : undefined,
    };
  }
}

export class OpenAIClient implements LLMClient {
  constructor(
    private apiKey: string,
    private model: string,
    private defaultTemperature: number = 0.5,
    private maxTokens: number = 4096
  ) {}

  async complete(
    systemPrompt: string,
    userMessage: string,
    temperature?: number
  ): Promise<LLMResponse> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: temperature ?? this.defaultTemperature,
        max_tokens: this.maxTokens,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API error (${res.status}): ${err}`);
    }

    const data = await res.json();
    return {
      content: data.choices?.[0]?.message?.content ?? "",
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
          }
        : undefined,
    };
  }
}

export class LMStudioClient implements LLMClient {
  constructor(
    private baseUrl: string,
    private model: string,
    private defaultTemperature: number = 0.5,
    private maxTokens: number = 4096
  ) {}

  async complete(
    systemPrompt: string,
    userMessage: string,
    temperature?: number
  ): Promise<LLMResponse> {
    const url = `${this.baseUrl.replace(/\/$/, "")}/v1/chat/completions`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: temperature ?? this.defaultTemperature,
        max_tokens: this.maxTokens,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`LM Studio API error (${res.status}): ${err}`);
    }

    const data = await res.json();
    return {
      content: data.choices?.[0]?.message?.content ?? "",
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
          }
        : undefined,
    };
  }
}

export class DummyLLMClient implements LLMClient {
  async complete(
    systemPrompt: string,
    userMessage: string,
  ): Promise<LLMResponse> {
    await new Promise((r) => setTimeout(r, 500 + Math.random() * 1000));

    const isChair = systemPrompt.includes("議長");
    const isRisk = systemPrompt.includes("リスクオフィサー");
    const isEditor = systemPrompt.includes("エディター");
    const isBtc = systemPrompt.includes("Bitcoin");
    const isGold = systemPrompt.includes("Gold");
    const isMacro = systemPrompt.includes("マクロ");

    if (isEditor) {
      return { content: this.generateEditorOutput(), usage: { promptTokens: 500, completionTokens: 1000 } };
    }
    if (isChair && userMessage.includes("論点")) {
      return {
        content: JSON.stringify({
          agenda: ["各候補資産のトレジャリー適合性評価", "マクロ経済環境の前提確認", "リスク許容度との整合性検証", "推奨アロケーション案の策定"],
          framing: "本委員会では、企業トレジャリーにおける代替資産の組入れ可否と適切な配分を審議します。",
        }),
        usage: { promptTokens: 300, completionTokens: 200 },
      };
    }
    if (isChair) {
      return {
        content: JSON.stringify({
          executive_summary: "各専門家の見解を統合した結果、保守的ながらも代替資産への段階的配分を推奨します。",
          scenarios: { base: "BTC 3-5%, Gold 5-10%, 残りは現金・短期国債。", bull: "BTC 5-8%, Gold 10-15%。", bear: "全額を現金・短期国債で保持。" },
          specialist_views_summary: { bitcoin: "長期的希少性は評価、ボラが課題。", gold: "安全資産として合理的。", macro: "実質金利低下局面で代替資産有利。" },
          risk_summary: "最大ドローダウン、流動性制約、規制リスクに注意。",
          proposed_allocation: { BTC: 0.03, Gold: 0.07, Cash: 0.6, "T-Bills": 0.3 },
          reasons_not_to_act: ["ボラティリティ超過の可能性", "規制環境の不確実性", "ステークホルダー理解不足"],
          monitoring_kpis: ["BTC 30日ボラ", "実質金利(米10年TIPS)", "ポートフォリオVaR", "流動性カバレッジ比率"],
        }),
        usage: { promptTokens: 800, completionTokens: 600 },
      };
    }

    const output = {
      summary: isBtc ? "BTC少額配分は合理的、ボラ管理が不可欠。" : isGold ? "金は安全資産として有効。" : isMacro ? "分散投資の合理性が増している。" : isRisk ? "複数の重大リスクが存在。" : "検討対象を評価しました。",
      key_arguments: isBtc ? ["希少性", "機関投資家参入", "ETF承認"] : isGold ? ["5000年の歴史", "中銀購入増", "低相関"] : isMacro ? ["実質金利不安定", "ドル購買力低下", "分散合理性"] : ["ボラ影響", "規制変更", "オペリスク"],
      risks: isBtc ? ["80%超DD", "規制不確実", "カストディ"] : isGold ? ["利回りゼロ", "保管コスト"] : isMacro ? ["予測不確実", "ブラックスワン"] : ["流動性危機時相関上昇", "集中リスク"],
      recommendation: isRisk ? "条件付き容認" : "条件付き採用",
      confidence: isRisk ? 0.6 : 0.7,
      ...(isRisk ? { red_flags: ["BTC最大DD80%超", "会計基準流動的", "カストディリスク残存"] } : {}),
    };
    return { content: JSON.stringify(output), usage: { promptTokens: 400, completionTokens: 300 } };
  }

  private generateEditorOutput(): string {
    return `# 投資委員会レポート\n\n## Executive Summary\n\n保守的ながらも代替資産への段階的配分を推奨。\n\n## 資産別評価\n\n### Bitcoin\n- 少額配分は合理的、ボラ管理不可欠\n- 推奨: 条件付き採用（3-5%）\n\n### Gold\n- 安全資産として合理的\n- 推奨: 条件付き採用（5-10%）\n\n## リスク評価\n\n- BTC最大DD80%超\n- 会計基準流動的\n- カストディリスク\n\n## 推奨アロケーション\n\n| 資産 | 配分 |\n|------|------|\n| BTC | 3% |\n| Gold | 7% |\n| Cash | 60% |\n| T-Bills | 30% |\n\n## 見送り理由\n\n1. ボラティリティ超過の可能性\n2. 規制環境の不確実性\n3. ステークホルダー理解不足\n\n## モニタリングKPI\n\n- BTC 30日ボラ\n- 実質金利（米10年TIPS）\n- ポートフォリオVaR\n- 流動性カバレッジ比率\n`;
  }
}

export function createLLMClient(settings: ModelSettings): LLMClient {
  switch (settings.provider) {
    case "openrouter":
      return new OpenRouterClient(settings.apiKey, settings.model, settings.temperature, settings.maxTokens);
    case "anthropic":
      return new AnthropicClient(settings.apiKey, settings.model, settings.temperature, settings.maxTokens);
    case "openai":
      return new OpenAIClient(settings.apiKey, settings.model, settings.temperature, settings.maxTokens);
    case "lmstudio":
      return new LMStudioClient(settings.baseUrl || "http://localhost:1234", settings.model, settings.temperature, settings.maxTokens);
    case "dummy":
    default:
      return new DummyLLMClient();
  }
}
