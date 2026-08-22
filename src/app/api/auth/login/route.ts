import { NextRequest, NextResponse } from "next/server";
import { readCredential, setSessionCookie, verifyPassword } from "@/server/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { password } = (await request.json()) as { password?: unknown };
    if (typeof password !== "string") {
      return NextResponse.json({ error: "Password is required." }, { status: 400 });
    }

    const credential = await readCredential();
    if (!credential) {
      return NextResponse.json({ error: "No vault has been set up yet." }, { status: 404 });
    }

    if (!(await verifyPassword(password, credential))) {
      // Deliberately vague and un-detailed: a wrong password should not reveal
      // anything about the stored one.
      return NextResponse.json({ error: "That password doesn't match." }, { status: 401 });
    }

    await setSessionCookie(credential.session_secret);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unexpected error" }, { status: 500 });
  }
}
