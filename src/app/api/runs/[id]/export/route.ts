import { NextResponse } from "next/server";
import { runsCollection } from "@/lib/firebase/collections";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const runDoc = await runsCollection().doc(id).get();
  if (!runDoc.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data = runDoc.data();
  const markdown = data?.markdownReport ?? "# レポートが見つかりません";

  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="report-${id}.md"`,
    },
  });
}
