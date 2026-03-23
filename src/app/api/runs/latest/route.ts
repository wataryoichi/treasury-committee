import { NextRequest, NextResponse } from "next/server";
import { runsCollection, runStepsCollection } from "@/lib/firebase/collections";

export async function GET(request: NextRequest) {
  const caseId = request.nextUrl.searchParams.get("caseId");
  if (!caseId) {
    return NextResponse.json({ error: "caseId is required" }, { status: 400 });
  }

  try {
    // Fetch all runs for this case, sort in code to avoid composite index
    const snapshot = await runsCollection()
      .where("caseId", "==", caseId)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ run: null, steps: [] });
    }

    // Sort by startedAt desc in code
    const runs = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const aTime = (a as Record<string, unknown>).startedAt as string || "";
        const bTime = (b as Record<string, unknown>).startedAt as string || "";
        return bTime.localeCompare(aTime);
      });

    const latestRun = runs[0] as Record<string, unknown> & { id: string };

    const stepsSnap = await runStepsCollection(latestRun.id).orderBy("startedAt").get();
    const steps = stepsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({
      run: latestRun,
      steps,
    });
  } catch (error) {
    console.error("Error fetching latest run:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
