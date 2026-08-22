import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

/*
  An in-memory stand-in for the state API.

  These component tests deliberately drive the real provider and the real
  `persistence/remote` transport rather than a mocked provider — that is what
  makes them catch wiring bugs. With the vault now in Postgres, the thing to
  substitute is the server, not the code under test, so this implements the
  four endpoints against a plain object and resets between tests. It mirrors
  the real routes' status codes, including 401 for a wrong password, because
  the client branches on them.
*/
interface FakeServer {
  credential: { password: string } | null;
  session: boolean;
  state: unknown | null;
  /** Counts state writes, so a test can assert coalescing rather than
   * asserting a debounce timing that no longer exists. */
  putCount: number;
}

const server: FakeServer = { credential: null, session: false, state: null, putCount: 0 };

export const fakeServer = {
  get putCount() {
    return server.putCount;
  },
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function handle(url: string, init?: RequestInit): Promise<Response> {
  const method = (init?.method ?? "GET").toUpperCase();
  const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};

  if (url === "/api/auth/session") {
    return json({ initialized: server.credential !== null, authenticated: server.session });
  }
  if (url === "/api/auth/setup" && method === "POST") {
    if (server.credential) return json({ error: "This vault already has a password." }, 409);
    server.credential = { password: String(body.password) };
    server.session = true;
    server.state = null;
    return json({ ok: true });
  }
  if (url === "/api/auth/login" && method === "POST") {
    if (!server.credential) return json({ error: "No vault has been set up yet." }, 404);
    if (server.credential.password !== String(body.password)) {
      return json({ error: "That password doesn't match." }, 401);
    }
    server.session = true;
    return json({ ok: true });
  }
  if (url === "/api/auth/logout" && method === "POST") {
    server.session = false;
    return json({ ok: true });
  }
  if (url === "/api/state") {
    if (!server.session) return json({ error: "Not signed in." }, 401);
    if (method === "PUT") {
      server.putCount += 1;
      server.state = body.state;
      return json({ ok: true, updatedAt: new Date().toISOString() });
    }
    if (method === "DELETE") {
      server.state = null;
      return json({ ok: true });
    }
    return json({ state: server.state });
  }
  return json({ error: `Unhandled route: ${method} ${url}` }, 404);
}

vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => handle(String(input), init));

/** Lets a test start from a vault that already exists (a "returning user"). */
export function seedFakeServer(state: unknown, password: string) {
  server.credential = { password };
  server.state = state;
  server.session = false;
}

beforeEach(() => {
  window.localStorage.clear();
  server.credential = null;
  server.session = false;
  server.state = null;
  server.putCount = 0;
});

if (!("randomUUID" in crypto)) {
  let counter = 0;
  Object.defineProperty(crypto, "randomUUID", {
    value: () => `test-uuid-${++counter}`,
  });
}

if (typeof window.matchMedia !== "function") {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

// jsdom doesn't implement HTMLDialogElement.showModal()/close() (the app's
// Dialog component already degrades gracefully without this), but polyfill
// them here so component tests exercise realistic open/close behavior
// instead of the degraded fallback path.
if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    const wasOpen = this.open;
    this.removeAttribute("open");
    if (wasOpen) this.dispatchEvent(new Event("close"));
  };
  // Real browsers close a modal <dialog> on Escape by firing a cancelable
  // "cancel" event on it. jsdom doesn't do this for our polyfilled
  // showModal, so approximate it here for tests.
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const openDialog = document.querySelector("dialog[open]");
    if (openDialog) openDialog.dispatchEvent(new Event("cancel", { cancelable: true }));
  });
}
