import useSWR from "swr";
import { ModelSettings } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useSettings() {
  const { data, error, isLoading, mutate } = useSWR<ModelSettings>(
    "/api/settings",
    fetcher
  );

  const updateSettings = async (updates: Partial<ModelSettings>) => {
    const current = data;
    const merged = { ...current, ...updates };
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(merged),
    });
    if (!res.ok) throw new Error("Failed to update settings");
    const updated = await res.json();
    mutate(updated);
    return updated;
  };

  return { settings: data, error, isLoading, mutate, updateSettings };
}
