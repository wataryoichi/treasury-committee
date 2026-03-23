import { NextResponse } from "next/server";
import { personasCollection } from "@/lib/firebase/collections";
import { DEFAULT_PERSONAS } from "@/lib/ai/personas";
import { PersonaConfig } from "@/lib/types";

export async function GET() {
  const snapshot = await personasCollection().orderBy("sortOrder").get();

  if (snapshot.empty) {
    // Seed default personas
    const batch = personasCollection().firestore.batch();
    const now = new Date().toISOString();
    const seeded: PersonaConfig[] = [];

    for (const persona of DEFAULT_PERSONAS) {
      const ref = personasCollection().doc(persona.key);
      const data = { ...persona, createdAt: now, updatedAt: now };
      batch.set(ref, data);
      seeded.push({ id: persona.key, ...data });
    }

    await batch.commit();
    return NextResponse.json(seeded);
  }

  const personas: PersonaConfig[] = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as PersonaConfig[];

  return NextResponse.json(personas);
}
