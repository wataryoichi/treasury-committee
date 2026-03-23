import { NextResponse } from "next/server";
import { casesCollection } from "@/lib/firebase/collections";
import { caseSchema } from "@/lib/schemas";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const doc = await casesCollection().doc(id).get();
  if (!doc.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ id: doc.id, ...doc.data() });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const partial = caseSchema.partial().safeParse(body);
  if (!partial.success) {
    return NextResponse.json({ error: partial.error.flatten() }, { status: 400 });
  }

  const now = new Date().toISOString();
  await casesCollection().doc(id).update({ ...partial.data, updatedAt: now });

  const doc = await casesCollection().doc(id).get();
  return NextResponse.json({ id: doc.id, ...doc.data() });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await casesCollection().doc(id).delete();
  return NextResponse.json({ success: true });
}
