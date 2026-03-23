import useSWR from "swr";
import { Case, CaseInput } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useCases() {
  const { data, error, isLoading, mutate } = useSWR<Case[]>("/api/cases", fetcher);

  const createCase = async (input: CaseInput) => {
    const res = await fetch("/api/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error("Failed to create case");
    const created = await res.json();
    mutate();
    return created as Case;
  };

  return { cases: data ?? [], error, isLoading, mutate, createCase };
}

export function useCase(id: string) {
  const { data, error, isLoading, mutate } = useSWR<Case>(
    id ? `/api/cases/${id}` : null,
    fetcher
  );

  const updateCase = async (input: Partial<CaseInput>) => {
    const res = await fetch(`/api/cases/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error("Failed to update case");
    const updated = await res.json();
    mutate(updated);
    return updated as Case;
  };

  const deleteCase = async () => {
    const res = await fetch(`/api/cases/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete case");
  };

  return { caseData: data, error, isLoading, mutate, updateCase, deleteCase };
}
