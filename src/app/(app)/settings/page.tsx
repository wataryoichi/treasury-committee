"use client";

import { useSettings } from "@/hooks/use-settings";
import { LLMProvider, PROVIDER_MODELS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const PROVIDERS: { value: LLMProvider; label: string; description: string }[] = [
  { value: "openrouter", label: "OpenRouter", description: "複数モデルに対応。推奨。" },
  { value: "anthropic", label: "Anthropic", description: "Claude API 直接利用" },
  { value: "openai", label: "OpenAI", description: "GPT-4o 等" },
  { value: "lmstudio", label: "LM Studio", description: "ローカルLLM。OpenAI互換API。" },
  { value: "dummy", label: "ダミー（テスト用）", description: "固定テキストを返す" },
];

export default function SettingsPage() {
  const { settings, isLoading, updateSettings } = useSettings();
  const [provider, setProvider] = useState<LLMProvider>("dummy");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [temperature, setTemperature] = useState(0.5);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setProvider(settings.provider);
      setApiKey(settings.apiKey);
      setModel(settings.model);
      setBaseUrl(settings.baseUrl ?? "");
      setTemperature(settings.temperature);
      setMaxTokens(settings.maxTokens);
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({ provider, apiKey, model, baseUrl, temperature, maxTokens });
      toast.success("設定を保存しました");
    } catch {
      toast.error("設定の保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const models = PROVIDER_MODELS[provider] ?? [];

  if (isLoading) return <p className="text-muted-foreground">読み込み中...</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">モデル設定</h2>
        <p className="text-muted-foreground">審議に使用するAIモデルとAPIキーを設定</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>プロバイダー</CardTitle>
          <CardDescription>使用するAIプロバイダーを選択してください</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {PROVIDERS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => {
                  setProvider(p.value);
                  setModel(PROVIDER_MODELS[p.value]?.[0] ?? "");
                }}
                className={`flex items-center justify-between rounded-lg border p-4 text-left transition-colors ${
                  provider === p.value
                    ? "border-primary bg-primary/5"
                    : "border-input hover:bg-accent"
                }`}
              >
                <div>
                  <div className="font-medium">{p.label}</div>
                  <div className="text-sm text-muted-foreground">{p.description}</div>
                </div>
                {provider === p.value && <Badge>選択中</Badge>}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {provider === "lmstudio" && (
        <Card>
          <CardHeader>
            <CardTitle>エンドポイント URL</CardTitle>
            <CardDescription>LM Studio のサーバーURL</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://localhost:1234"
            />
          </CardContent>
        </Card>
      )}

      {provider !== "dummy" && provider !== "lmstudio" && (
        <Card>
          <CardHeader>
            <CardTitle>API キー</CardTitle>
            <CardDescription>
              {provider === "openrouter" && "openrouter.ai のダッシュボードから取得"}
              {provider === "anthropic" && "console.anthropic.com から取得"}
              {provider === "openai" && "platform.openai.com から取得"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-or-..."
            />
          </CardContent>
        </Card>
      )}

      {provider !== "dummy" && (
        <Card>
          <CardHeader>
            <CardTitle>モデル</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {models.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModel(m)}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    model === m
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input hover:bg-accent"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <Label>またはカスタムモデル名</Label>
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="model-name"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>パラメータ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Temperature</Label>
              <span className="text-sm text-muted-foreground">{temperature.toFixed(2)}</span>
            </div>
            <Slider
              value={temperature}
              onValueChange={(v) => setTemperature(typeof v === "number" ? v : v[0])}
              min={0}
              max={1}
              step={0.05}
            />
          </div>
          <div className="space-y-2">
            <Label>最大トークン数</Label>
            <Input
              type="number"
              value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value))}
              min={256}
              max={32768}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "保存中..." : "設定を保存"}
      </Button>
    </div>
  );
}
