import useSWR from "swr";
import { Run, RunStep } from "@/lib/types";
import { useState, useCallback } from "react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useRun(runId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<{ run: Run; steps: RunStep[] }>(
    runId ? `/api/runs/${runId}` : null,
    fetcher,
    { refreshInterval: runId ? 2000 : 0 }
  );

  const isRunning = data?.run?.status === "running" || data?.run?.status === "pending";

  return {
    run: data?.run,
    steps: data?.steps ?? [],
    error,
    isLoading,
    isRunning,
    mutate,
  };
}

export function useLatestRun(caseId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<{ run: Run | null; steps: RunStep[] }>(
    caseId ? `/api/runs/latest?caseId=${caseId}` : null,
    fetcher,
    { refreshInterval: 3000 }
  );

  const isRunning = data?.run?.status === "running" || data?.run?.status === "pending";

  return {
    run: data?.run ?? null,
    steps: data?.steps ?? [],
    error,
    isLoading,
    isRunning,
    mutate,
  };
}

export function useRunLauncher() {
  const [launching, setLaunching] = useState(false);

  const startRun = useCallback(async (caseId: string) => {
    setLaunching(true);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId }),
      });
      if (!res.ok) throw new Error("Failed to start run");
      const { id } = await res.json();
      return id as string;
    } finally {
      setLaunching(false);
    }
  }, []);

  return { launching, startRun };
}
