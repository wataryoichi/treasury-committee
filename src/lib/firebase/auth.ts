import { auth } from "@/lib/firebase/config";

/**
 * Returns the Firebase Auth instance.
 */
export function getFirebaseAuth() {
  return auth;
}
