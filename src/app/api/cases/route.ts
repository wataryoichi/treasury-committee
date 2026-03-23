import { NextResponse } from "next/server";
import { casesCollection } from "@/lib/firebase/collections";
import { caseSchema } from "@/lib/schemas";
import { Case } from "@/lib/types";

export async function GET() {
  const snapshot = await casesCollection().orderBy("createdAt", "desc").get();
  const cases: Case[] = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Case[];
  return NextResponse.json(cases);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = caseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const now = new Date().toISOString();
  const data = { ...parsed.data, createdAt: now, updatedAt: now };
  const docRef = await casesCollection().add(data);

  return NextResponse.json({ id: docRef.id, ...data }, { status: 201 });
}
