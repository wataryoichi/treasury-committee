"use client";

import { useRouter } from "next/navigation";
import { CaseForm } from "@/components/cases/case-form";
import { useCases } from "@/hooks/use-cases";
import { CaseFormValues } from "@/lib/schemas";
import { toast } from "sonner";

export default function NewCasePage() {
  const router = useRouter();
  const { createCase } = useCases();

  const handleSubmit = async (values: CaseFormValues) => {
    try {
      const created = await createCase(values);
      toast.success("ケースを作成しました");
      router.push(`/cases/${created.id}`);
    } catch {
      toast.error("ケースの作成に失敗しました");
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">新規ケース作成</h2>
      <CaseForm onSubmit={handleSubmit} />
    </div>
  );
}
