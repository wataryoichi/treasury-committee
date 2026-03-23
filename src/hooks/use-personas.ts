import useSWR from "swr";
import { PersonaConfig } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function usePersonas() {
  const { data, error, isLoading, mutate } = useSWR<PersonaConfig[]>(
    "/api/personas",
    fetcher
  );

  const updatePersona = async (key: string, updates: Partial<PersonaConfig>) => {
    const res = await fetch(`/api/personas/${key}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error("Failed to update persona");
    mutate();
  };

  return { personas: data ?? [], error, isLoading, mutate, updatePersona };
}
