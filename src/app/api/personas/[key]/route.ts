import { NextResponse } from "next/server";
import { personasCollection } from "@/lib/firebase/collections";
import { personaUpdateSchema } from "@/lib/schemas";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const body = await request.json();
  const parsed = personaUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const now = new Date().toISOString();
  await personasCollection().doc(key).update({ ...parsed.data, updatedAt: now });

  const doc = await personasCollection().doc(key).get();
  return NextResponse.json({ id: doc.id, ...doc.data() });
}
