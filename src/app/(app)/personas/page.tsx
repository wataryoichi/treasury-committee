"use client";

import { usePersonas } from "@/hooks/use-personas";
import { PersonaConfig } from "@/lib/types";
import { PERSONA_ROLE_LABELS } from "@/lib/ai/personas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import type { PersonaRole } from "@/lib/types";

export default function PersonasPage() {
  const { personas, isLoading, updatePersona } = usePersonas();

  const handleToggle = async (persona: PersonaConfig, enabled: boolean) => {
    if (persona.key === "chair") {
      toast.error("議長は無効化できません");
      return;
    }
    await updatePersona(persona.key, { enabled });
    toast.success(`${persona.displayName} を${enabled ? "有効" : "無効"}にしました`);
  };

  if (isLoading) return <p className="text-muted-foreground">読み込み中...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">ペルソナ設定</h2>
        <p className="text-muted-foreground">AI専門家の有効/無効切替とプロンプト編集</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {personas.map((persona) => (
          <PersonaCard
            key={persona.key}
            persona={persona}
            onToggle={handleToggle}
            onUpdate={updatePersona}
          />
        ))}
      </div>
    </div>
  );
}

function PersonaCard({
  persona,
  onToggle,
  onUpdate,
}: {
  persona: PersonaConfig;
  onToggle: (p: PersonaConfig, enabled: boolean) => void;
  onUpdate: (key: string, updates: Partial<PersonaConfig>) => Promise<void>;
}) {
  const [editPrompt, setEditPrompt] = useState(persona.systemPrompt);
  const [open, setOpen] = useState(false);

  const handleSave = async () => {
    await onUpdate(persona.key, { systemPrompt: editPrompt });
    toast.success("プロンプトを更新しました");
    setOpen(false);
  };

  return (
    <Card className={!persona.enabled ? "opacity-50" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{persona.displayName}</CardTitle>
          <Switch
            checked={persona.enabled}
            onCheckedChange={(v) => onToggle(persona, v)}
            disabled={persona.key === "chair"}
          />
        </div>
        <CardDescription>
          <Badge variant="outline" className="mr-1">
            {PERSONA_ROLE_LABELS[persona.key as PersonaRole] ?? persona.key}
          </Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">{persona.roleDescription}</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button variant="outline" size="sm" className="w-full" />}>
              プロンプト編集
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{persona.displayName} - システムプロンプト</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>システムプロンプト</Label>
                <Textarea
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  rows={15}
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  キャンセル
                </Button>
                <Button onClick={handleSave}>保存</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
