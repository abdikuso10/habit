import { NextResponse } from "next/server";
import { isAuthenticated, readCredential } from "@/server/auth";

// Never cached: the answer is per-request by definition.
export const dynamic = "force-dynamic";

/*
  Tells the client which of three states it is in before it renders anything:
  no vault yet (show setup), a vault but no session (show the lock screen), or
  signed in (load the data). Deliberately returns no data of its own.
*/
export async function GET() {
  try {
    const credential = await readCredential();
    return NextResponse.json({
      initialized: credential !== null,
      authenticated: credential !== null && (await isAuthenticated()),
    });
  } catch (error) {
    return NextResponse.json({ error: describe(error) }, { status: 500 });
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}
