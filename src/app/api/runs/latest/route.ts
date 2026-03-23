import { NextRequest, NextResponse } from "next/server";
import { runsCollection, runStepsCollection } from "@/lib/firebase/collections";

export async function GET(request: NextRequest) {
  const caseId = request.nextUrl.searchParams.get("caseId");
  if (!caseId) {
    return NextResponse.json({ error: "caseId is required" }, { status: 400 });
  }

  const snapshot = await runsCollection()
    .where("caseId", "==", caseId)
    .orderBy("startedAt", "desc")
    .limit(1)
    .get();

  if (snapshot.empty) {
    return NextResponse.json({ run: null, steps: [] });
  }

  const runDoc = snapshot.docs[0];
  const stepsSnap = await runStepsCollection(runDoc.id).orderBy("startedAt").get();
  const steps = stepsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return NextResponse.json({
    run: { id: runDoc.id, ...runDoc.data() },
    steps,
  });
}
