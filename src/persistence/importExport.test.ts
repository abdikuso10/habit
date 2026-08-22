import { describe, expect, it } from "vitest";
import { buildExportPayload, previewImport } from "./importExport";
import { createInitialState } from "./factory";
import { LegacyTrackerStateV4 } from "./legacyV4";

describe("previewImport", () => {
  it("rejects invalid JSON without throwing", () => {
    const result = previewImport("{not valid json");
    expect(result.ok).toBe(false);
  });

  it("rejects a JSON file that isn't a Yawm Wahid backup", () => {
    const result = previewImport(JSON.stringify({ hello: "world" }));
    expect(result.ok).toBe(false);
  });

  it("accepts a bare current-version state object", () => {
    const state = createInitialState("hash", "2026-01-01");
    const result = previewImport(JSON.stringify(state));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.migratedFrom).toBe(null);
      expect(result.state.dayOneDate).toBe("2026-01-01");
    }
  });

  it("accepts the wrapped export payload format and reads its metadata", () => {
    const state = createInitialState("hash", "2026-01-01");
    const payload = buildExportPayload(state, "2026-02-01T00:00:00.000Z");
    const result = previewImport(JSON.stringify(payload));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.summary.exportedAt).toBe("2026-02-01T00:00:00.000Z");
    }
  });

  it("accepts and migrates a bare legacy v4 backup", () => {
    const legacy: LegacyTrackerStateV4 = {
      version: 4,
      passwordHash: "hash",
      dayOneDate: "2026-01-01",
      savingsTotal: 100,
      debtRemaining: 98000,
      habitsByPillar: { spiritual: [], body: [], mind: [] },
      days: {},
    };
    const result = previewImport(JSON.stringify(legacy));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.migratedFrom).toBe(4);
      expect(result.state.version).toBe(6);
    }
  });

  it("never throws on structurally-almost-right but invalid data", () => {
    expect(() => previewImport(JSON.stringify({ version: 5, passwordHash: 123 }))).not.toThrow();
    expect(previewImport(JSON.stringify({ version: 5, passwordHash: 123 })).ok).toBe(false);
  });
});
