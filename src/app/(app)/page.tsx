"use client";

import Link from "next/link";
import { useCases } from "@/hooks/use-cases";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  const { cases, isLoading } = useCases();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">ダッシュボード</h2>
          <p className="text-muted-foreground">AI投資委員会シミュレーター</p>
        </div>
        <Link href="/cases/new" className={cn(buttonVariants({ variant: "default" }))}>新規ケース作成</Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>ケース数</CardDescription>
            <CardTitle className="text-3xl">{isLoading ? "..." : cases.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>最近の審議</CardDescription>
            <CardTitle className="text-3xl">-</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>ペルソナ</CardDescription>
            <CardTitle className="text-3xl">6</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {cases.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">最近のケース</h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {cases.slice(0, 6).map((c) => (
              <Link key={c.id} href={`/cases/${c.id}`}>
                <Card className="hover:bg-accent transition-colors cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{c.name}</CardTitle>
                    <CardDescription>{c.companyName}</CardDescription>
                  </CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
