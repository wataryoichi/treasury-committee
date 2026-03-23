import { NextResponse } from "next/server";
import { runsCollection, runStepsCollection } from "@/lib/firebase/collections";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const runDoc = await runsCollection().doc(id).get();
  if (!runDoc.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const stepsSnap = await runStepsCollection(id).orderBy("startedAt").get();
  const steps = stepsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return NextResponse.json({
    run: { id: runDoc.id, ...runDoc.data() },
    steps,
  });
}
