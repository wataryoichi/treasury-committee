"use client";

import Link from "next/link";
import { useCases } from "@/hooks/use-cases";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CasesPage() {
  const { cases, isLoading } = useCases();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">ケース一覧</h2>
        <Link href="/cases/new" className={cn(buttonVariants({ variant: "default" }))}>新規ケース作成</Link>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">読み込み中...</p>
      ) : cases.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">ケースがまだありません</p>
            <Link href="/cases/new" className={cn(buttonVariants({ variant: "default" }))}>最初のケースを作成</Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cases.map((c) => (
            <Link key={c.id} href={`/cases/${c.id}`}>
              <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="text-base">{c.name}</CardTitle>
                  <CardDescription>{c.companyName}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    現預金: ${c.cashUsd?.toLocaleString() ?? "-"}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {c.candidateAssets.map((a) => (
                      <span
                        key={a}
                        className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(c.updatedAt).toLocaleDateString("ja-JP")}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
