import { adminDb } from "./admin";

export const casesCollection = () => adminDb.collection("cases");
export const personasCollection = () => adminDb.collection("personaConfigs");
export const runsCollection = () => adminDb.collection("runs");
export const runStepsCollection = (runId: string) =>
  adminDb.collection("runs").doc(runId).collection("steps");
export const settingsCollection = () => adminDb.collection("appSettings");
