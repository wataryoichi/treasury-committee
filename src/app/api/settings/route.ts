import { NextResponse } from "next/server";
import { settingsCollection } from "@/lib/firebase/collections";
import { ModelSettings } from "@/lib/types";

const SETTINGS_DOC_ID = "model";

const DEFAULT_SETTINGS: Omit<ModelSettings, "id"> = {
  provider: "dummy",
  apiKey: "",
  model: "dummy",
  baseUrl: "",
  temperature: 0.5,
  maxTokens: 4096,
  updatedAt: new Date().toISOString(),
};

export async function GET() {
  const doc = await settingsCollection().doc(SETTINGS_DOC_ID).get();
  if (!doc.exists) {
    return NextResponse.json({ id: SETTINGS_DOC_ID, ...DEFAULT_SETTINGS });
  }
  return NextResponse.json({ id: doc.id, ...doc.data() });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const now = new Date().toISOString();
  const data = {
    provider: body.provider ?? "dummy",
    apiKey: body.apiKey ?? "",
    model: body.model ?? "dummy",
    baseUrl: body.baseUrl ?? "",
    temperature: body.temperature ?? 0.5,
    maxTokens: body.maxTokens ?? 4096,
    updatedAt: now,
  };
  await settingsCollection().doc(SETTINGS_DOC_ID).set(data);
  return NextResponse.json({ id: SETTINGS_DOC_ID, ...data });
}
