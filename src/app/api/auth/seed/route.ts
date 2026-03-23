import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import "@/lib/firebase/admin"; // ensure admin is initialised

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = body.email;
  const password = body.password;

  if (!email || !password) {
    return NextResponse.json(
      { error: "email and password are required in request body" },
      { status: 400 }
    );
  }

  const adminAuth = getAuth();

  try {
    const existing = await adminAuth
      .getUserByEmail(email)
      .catch(() => null);

    if (existing) {
      return NextResponse.json(
        { message: "User already exists", uid: existing.uid },
        { status: 200 }
      );
    }

    const user = await adminAuth.createUser({
      email,
      password,
      displayName: "Admin",
    });

    return NextResponse.json(
      { message: "User created", uid: user.uid },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
