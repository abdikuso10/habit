// The only module that talks to the state API. Components and the provider go
// through it, the way they previously went through the localStorage
// repository, so transport details stay in one place.

import { TrackerState } from "./types";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface SessionInfo {
  initialized: boolean;
  authenticated: boolean;
}

async function asJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

export async function fetchSession(): Promise<SessionInfo> {
  return asJson<SessionInfo>(await fetch("/api/auth/session", { cache: "no-store" }));
}

export async function setupVault(password: string): Promise<void> {
  await asJson(
    await fetch("/api/auth/setup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    })
  );
}

/** Resolves true on success, false on a wrong password; throws on anything else
 * (network down, server error) so the UI can tell "wrong password" apart from
 * "couldn't reach the server". */
export async function login(password: string): Promise<boolean> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (response.status === 401) return false;
  await asJson(response);
  return true;
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}

export async function fetchState(): Promise<TrackerState | null> {
  const body = await asJson<{ state: TrackerState | null }>(await fetch("/api/state", { cache: "no-store" }));
  return body.state;
}

export async function putState(state: TrackerState): Promise<void> {
  await asJson(
    await fetch("/api/state", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ state }),
    })
  );
}

/*
  Writes are coalesced and serialised.

  The app calls persist on every tick of a habit and every keystroke of the
  journal. Firing a PUT per call would put several full-document writes in
  flight at once, and because they can complete out of order the last one to
  land — not the last one made — would win. So: at most one request in flight,
  and while it is running only the newest pending state is kept. Intermediate
  states are dropped on purpose; each PUT carries the whole document, so the
  newest one contains everything the dropped ones did.

  In-flight coalescing alone is not enough. It only merges writes that overlap,
  and against a fast server they don't: type twenty characters and each one's
  request finishes before the next keystroke, producing twenty full-document
  writes. So callers that fire per keystroke pass a delay, which holds the
  newest state briefly and sends once — the journal's old debounce, moved
  behind the same queue that serialises everything else.

  With the database as the only copy, a failed write is data the user will
  otherwise lose. The queue retries with backoff and reports "error" until a
  write succeeds, so the UI can say so rather than looking saved.
*/
export function createWriteQueue(onStatus: (status: SaveStatus) => void, retryDelaysMs = [1000, 3000, 8000]) {
  let pending: TrackerState | null = null;
  let inFlight = false;
  let attempt = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  async function drain(): Promise<void> {
    if (inFlight || pending === null) return;
    const next = pending;
    pending = null;
    inFlight = true;
    onStatus("saving");
    try {
      await putState(next);
      attempt = 0;
      onStatus(pending === null ? "saved" : "saving");
    } catch {
      // Put it back only if nothing newer arrived while we were failing.
      if (pending === null) pending = next;
      onStatus("error");
      const delay = retryDelaysMs[Math.min(attempt, retryDelaysMs.length - 1)];
      attempt += 1;
      timer = setTimeout(() => {
        timer = null;
        void drain();
      }, delay);
    } finally {
      inFlight = false;
    }
    if (pending !== null && timer === null) void drain();
  }

  return {
    /**
     * @param delayMs Hold the newest state this long before sending. Use 0 for
     * discrete actions the user expects to stick (ticking a habit), and a small
     * delay for per-keystroke input.
     */
    push(state: TrackerState, delayMs = 0) {
      pending = state;
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      if (delayMs <= 0) {
        void drain();
        return;
      }
      onStatus("saving");
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        void drain();
      }, delayMs);
    },
    /** True while anything is unsaved — used to warn before the tab closes. */
    hasUnsaved(): boolean {
      return pending !== null || inFlight || debounceTimer !== null;
    },
    cancel() {
      if (timer) clearTimeout(timer);
      if (debounceTimer) clearTimeout(debounceTimer);
      timer = null;
      debounceTimer = null;
      pending = null;
    },
  };
}
