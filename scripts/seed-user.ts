/**
 * Seed script to create a default admin user in Firebase Auth.
 *
 * Usage:
 *   npx tsx scripts/seed-user.ts
 *
 * Requires the following env vars (or .env.local loaded via dotenv):
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID
 *   FIREBASE_ADMIN_CLIENT_EMAIL
 *   FIREBASE_ADMIN_PRIVATE_KEY
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local
config({ path: resolve(__dirname, "../.env.local") });

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (getApps().length === 0) {
  if (clientEmail && privateKey) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  } else {
    initializeApp({ projectId });
  }
}

const SEED_EMAIL = process.env.SEED_EMAIL || "admin@example.com";
const SEED_PASSWORD = process.env.SEED_PASSWORD || "changeme123";

async function main() {
  const auth = getAuth();

  const existing = await auth.getUserByEmail(SEED_EMAIL).catch(() => null);
  if (existing) {
    console.log(`User already exists: ${existing.uid}`);
    return;
  }

  const user = await auth.createUser({
    email: SEED_EMAIL,
    password: SEED_PASSWORD,
    displayName: "Admin",
  });

  console.log(`User created: ${user.uid}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
