"use client";

// The app's single state container. It stays intentionally thin: almost
// every calculation here delegates to src/domain (pure, unit-tested
// functions) and every read/write of localStorage delegates to
// src/persistence/repository. This file's job is React glue — holding
// state, wiring actions to domain functions, and persisting the result —
// not business logic.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  cancelCommitment as domainCancelCommitment,
  createCommitment,
  markKept,
  rescheduleCommitment as domainReschedule,
  undoKept,
} from "@/domain/commitments";
import { computeAnalytics } from "@/domain/analytics";
import { computeAllHabitStrengths, HabitStrength } from "@/domain/automaticity";
import { calcStreak } from "@/domain/completion";
import { Insight, computeInsights } from "@/domain/insights";
import { DayRecovery, HabitRisk, computeAllHabitRisks, computeDayRecovery } from "@/domain/recovery";
import { createTransaction } from "@/domain/finance";
import { flattenHabits, generateHabitId } from "@/domain/habits";
import { elapsedSeconds } from "@/domain/timer";
import { createInitialState } from "@/persistence/factory";
import {
  BackupImportError,
  ImportPreview,
  exportBackupToFile,
  previewImport,
} from "@/persistence/importExport";
import {
  CorruptedStateError,
  createWriteQueue,
  fetchSession,
  fetchState,
  login as remoteLogin,
  logout as remoteLogout,
  putState,
  setupVault,
  type SaveStatus,
} from "@/persistence/remote";
import {
  Commitment,
  CommitmentStatus,
  DayRecord,
  Habit,
  HabitCue,
  HabitLevel,
  HabitMetric,
  HabitSchedule,
  MoneySettings,
  MoneyTransactionType,
  PillarId,
  RunningTimerState,
  SpecialDayState,
  TrackerState,
} from "@/persistence/types";
import { todayKey as getTodayKey, getJourneyWindow } from "@/domain/date";

const ROLLOVER_CHECK_MS = 30_000;
const TIMER_SAFETY_FLUSH_MS = 15_000;

function nowIso(): string {
  return new Date().toISOString();
}

function emptyDay(): DayRecord {
  return { habits: {}, journal: "" };
}

/*
  `unreachable` exists because the database is now the only copy of the data.
  Previously a failure to read storage meant corruption; now it usually means
  the network is down, and telling the user "your data is corrupted" when it is
  sitting safely in Postgres would be both wrong and frightening.
*/
export type LoadStatus = "loading" | "empty" | "ready" | "corrupted" | "unreachable";

export interface TrackerContextValue {
  loadStatus: LoadStatus;
  hasAccount: boolean;
  isUnlocked: boolean;
  today: string;
  dayNumber: number;
  totalJourneyDays: number;
  daysRemaining: number;
  journeyProgressPct: number;
  streak: number;
  state: TrackerState | null;
  journalSaveStatus: "idle" | "saving" | "saved";
  corruptedBackupKey: string | null;
  /** Whether the last write reached the database. With no local copy, a
   * failure here is unsaved work and has to be visible. */
  saveStatus: SaveStatus;

  createAccount: (password: string, dayOneDate: string) => Promise<void>;
  unlock: (password: string) => Promise<boolean>;
  lock: () => void;

  getDayRecord: (dateKey: string) => DayRecord;
  toggleCheckboxHabit: (dateKey: string, habitId: string) => void;
  setHabitValue: (dateKey: string, habitId: string, value: number) => void;
  setSpecialDay: (dateKey: string, state: SpecialDayState) => void;
  setIntention: (dateKey: string, text: string) => void;
  setReflection: (dateKey: string, text: string) => void;

  setJournal: (dateKey: string, text: string) => void;
  toggleJournalFavorite: (dateKey: string) => void;

  addHabit: (
    pillarId: PillarId,
    input: {
      label: string;
      jp?: string;
      metric?: HabitMetric;
      schedule?: HabitSchedule;
      level?: HabitLevel;
      cue?: HabitCue;
    }
  ) => void;
  editHabit: (pillarId: PillarId, habitId: string, patch: Partial<Omit<Habit, "id">>) => void;
  archiveHabit: (pillarId: PillarId, habitId: string) => void;
  restoreHabit: (pillarId: PillarId, habitId: string) => void;
  pauseHabit: (pillarId: PillarId, habitId: string, until: string) => void;
  resumeHabit: (pillarId: PillarId, habitId: string) => void;
  deleteHabit: (pillarId: PillarId, habitId: string) => void;
  reorderHabits: (pillarId: PillarId, orderedIds: string[]) => void;

  addCommitment: (input: {
    text: string;
    targetDate?: string;
    targetTime?: string;
    pillarId?: PillarId;
    note?: string;
  }) => void;
  keepCommitment: (id: string) => void;
  undoKeptCommitment: (id: string) => void;
  cancelCommitment: (id: string) => void;
  rescheduleCommitment: (id: string, next: { targetDate?: string; targetTime?: string }) => void;
  deleteCommitment: (id: string) => void;

  addTransaction: (input: { type: MoneyTransactionType; amount: number; date: string; note?: string }) => void;
  deleteTransaction: (id: string) => void;
  updateMoneySettings: (patch: Partial<MoneySettings>) => void;

  /**
   * Derived behavioural signals. All of these are computed, never stored —
   * the same rule the rest of the app follows for anything that could drift.
   * They're memoised on state + today because the whole history is walked to
   * produce them.
   */
  insights: Insight[];
  habitRisks: HabitRisk[];
  habitStrengths: HabitStrength[];
  dayRecovery: DayRecovery | null;

  timer: RunningTimerState | null;
  startTimer: (kind: "focus" | "meditation", targetSeconds?: number) => void;
  stopTimer: () => void;
  timerElapsedSeconds: (nowMs: number) => number;

  updateSettings: (patch: Partial<Pick<TrackerState["settings"], "locale" | "focusTargetMinutes" | "meditationDefaultMinutes">>) => void;
  /** Sets the daily focus target on both the deepWork habit and the setting, in one write. */
  setFocusTarget: (minutes: number) => void;

  exportBackup: () => void;
  previewImportFile: (text: string) => ImportPreview;
  confirmImport: (candidate: TrackerState) => Promise<{ ok: boolean; error?: string }>;
}

/*
  The v6 schema still requires `passwordHash` on the document, but the password
  is now verified server-side against a scrypt hash in its own table. This
  marker goes in the field so nothing mistakes a leftover SHA-256 digest for a
  live credential. Removing the field outright is a schema migration (v6 -> v7)
  and is deliberately not bundled into this change.
*/
const SERVER_MANAGED_PASSWORD = "server-managed";

const TrackerContext = createContext<TrackerContextValue | null>(null);

export function TrackerProvider({ children }: { children: React.ReactNode }) {
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [corruptedBackupKey] = useState<string | null>(null);
  const [state, setState] = useState<TrackerState | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [today, setToday] = useState(getTodayKey());
  const [journalSaveStatus, setJournalSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  // Lazy initial state, not a ref: created once, stable for the life of the
  // provider, and readable during render.
  const [writeQueue] = useState(() =>
    createWriteQueue((status: SaveStatus) => {
      setSaveStatus(status);
      // The journal indicator rides the same signal, so "saved" under the
      // textarea means saved in Postgres, not saved to a queue.
      if (status === "saving") setJournalSaveStatus("saving");
      if (status === "saved") setJournalSaveStatus("saved");
    })
  );

  /*
    Load is now a round trip, not a synchronous read: ask the server who we are,
    and fetch the vault only once it says we are signed in. Three answers map
    onto the three screens AppChrome already gates on — no credential means
    setup, a credential without a session means the lock screen, and both means
    the app itself.
  */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const session = await fetchSession();
        if (cancelled) return;
        if (!session.initialized) {
          setLoadStatus("empty");
          return;
        }
        if (!session.authenticated) {
          setState(null);
          setIsUnlocked(false);
          setLoadStatus("ready");
          return;
        }
        const remote = await fetchState();
        if (cancelled) return;
        setState(remote);
        setIsUnlocked(true);
        setLoadStatus(remote ? "ready" : "empty");
      } catch (error) {
        if (cancelled) return;
        // A document the server can read but not validate is a different
        // problem from a server we can't reach, and needs a different screen.
        setLoadStatus(error instanceof CorruptedStateError ? "corrupted" : "unreachable");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Roll "today" over at midnight without requiring a manual refresh.
  useEffect(() => {
    const interval = setInterval(() => setToday(getTodayKey()), ROLLOVER_CHECK_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible") setToday(getTodayKey());
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  /*
    Cross-tab sync used to ride on the localStorage `storage` event. With the
    database as the source of truth the equivalent is re-reading on focus:
    another tab (or another device) may have written since this one last
    looked. Cheap, and it keeps two open tabs from silently diverging.
  */
  useEffect(() => {
    if (!isUnlocked) return;
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      if (writeQueue.hasUnsaved()) return; // our own writes win
      void fetchState()
        .then((incoming) => incoming && setState(incoming))
        .catch(() => {});
    };
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [isUnlocked, writeQueue]);

  /*
    There is no local copy to fall back on any more, so a tab closed with a
    write still in flight loses that change. Warn instead of flushing — a
    synchronous flush isn't possible against a network round trip.
  */
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!writeQueue.hasUnsaved()) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [writeQueue]);

  /*
    Two paths, as before. A habit tick is a discrete act the user expects to
    stick, so it goes immediately; the journal fires per keystroke, so it is
    held briefly and sent once. Both end up in the same queue, which serialises
    them and keeps only the newest document.
  */
  const JOURNAL_DEBOUNCE_MS = 800;
  const persist = useCallback((next: TrackerState) => {
    setState(next);
    writeQueue.push(next);
  }, [writeQueue]);

  const persistDebounced = useCallback((next: TrackerState) => {
    setState(next);
    setJournalSaveStatus("saving");
    writeQueue.push(next, JOURNAL_DEBOUNCE_MS);
  }, [writeQueue]);

  /*
    The password is no longer hashed here. It is sent once to the server, which
    hashes it with scrypt and a random salt and returns a session cookie — the
    browser never holds anything it could compare against, because the browser
    is no longer the thing doing the deciding. `passwordHash` stays on the
    document only because the v6 schema and its validator still require the
    field; nothing reads it any more.
  */
  const createAccount = useCallback(
    async (password: string, dayOneDate: string) => {
      await setupVault(password);
      const next = createInitialState(SERVER_MANAGED_PASSWORD, dayOneDate);
      persist(next);
      setLoadStatus("ready");
      setIsUnlocked(true);
    },
    [persist]
  );

  const unlock = useCallback(async (password: string) => {
    const ok = await remoteLogin(password);
    if (!ok) return false;
    const remote = await fetchState();
    setState(remote);
    setIsUnlocked(true);
    setLoadStatus(remote ? "ready" : "empty");
    return true;
  }, []);

  /* Locking now ends the server session too, so the cookie can't be reused. */
  const lock = useCallback(() => {
    setIsUnlocked(false);
    setState(null);
    void remoteLogout();
  }, []);

  const getDayRecord = useCallback(
    (dateKey: string): DayRecord => state?.days[dateKey] ?? emptyDay(),
    [state]
  );

  const mutateDay = useCallback(
    (dateKey: string, fn: (day: DayRecord) => DayRecord) => {
      if (!state) return;
      const current = state.days[dateKey] ?? emptyDay();
      persist({ ...state, days: { ...state.days, [dateKey]: fn(current) } });
    },
    [state, persist]
  );

  const toggleCheckboxHabit = useCallback(
    (dateKey: string, habitId: string) => {
      mutateDay(dateKey, (day) => ({
        ...day,
        habits: { ...day.habits, [habitId]: !day.habits[habitId] },
      }));
    },
    [mutateDay]
  );

  const setHabitValue = useCallback(
    (dateKey: string, habitId: string, value: number) => {
      mutateDay(dateKey, (day) => ({
        ...day,
        habitValues: { ...day.habitValues, [habitId]: Math.max(0, value) },
      }));
    },
    [mutateDay]
  );

  const setSpecialDay = useCallback(
    (dateKey: string, specialState: SpecialDayState) => {
      mutateDay(dateKey, (day) => ({
        ...day,
        specialState: specialState === "normal" ? undefined : specialState,
      }));
    },
    [mutateDay]
  );

  const setIntention = useCallback(
    (dateKey: string, text: string) => mutateDay(dateKey, (day) => ({ ...day, intention: text })),
    [mutateDay]
  );

  const setReflection = useCallback(
    (dateKey: string, text: string) => mutateDay(dateKey, (day) => ({ ...day, reflection: text })),
    [mutateDay]
  );

  const setJournal = useCallback(
    (dateKey: string, text: string) => {
      if (!state) return;
      const day = state.days[dateKey] ?? emptyDay();
      const nextDay: DayRecord = {
        ...day,
        journal: text,
        journalUpdatedAt: nowIso(),
        // A longer entry can also complete the "journal" habit — visible and
        // testable via this exact threshold, not a hidden side effect.
        habits: {
          ...day.habits,
          journal: text.trim().length > JOURNAL_COMPLETE_THRESHOLD ? true : day.habits.journal,
        },
      };
      persistDebounced({ ...state, days: { ...state.days, [dateKey]: nextDay } });
    },
    [state, persistDebounced]
  );

  const toggleJournalFavorite = useCallback(
    (dateKey: string) => {
      mutateDay(dateKey, (day) => ({ ...day, journalFavorite: !day.journalFavorite }));
    },
    [mutateDay]
  );

  const mutateHabit = useCallback(
    (pillarId: PillarId, habitId: string, fn: (habit: Habit) => Habit) => {
      if (!state) return;
      const list = state.habitsByPillar[pillarId] ?? [];
      persist({
        ...state,
        habitsByPillar: {
          ...state.habitsByPillar,
          [pillarId]: list.map((h) => (h.id === habitId ? fn(h) : h)),
        },
      });
    },
    [state, persist]
  );

  const addHabit = useCallback(
    (
      pillarId: PillarId,
      input: {
        label: string;
        jp?: string;
        metric?: HabitMetric;
        schedule?: HabitSchedule;
        level?: HabitLevel;
        cue?: HabitCue;
      }
    ) => {
      if (!state || !input.label.trim()) return;
      const habit: Habit = {
        id: generateHabitId(),
        label: input.label.trim(),
        jp: input.jp,
        metric: input.metric ?? { type: "checkbox" },
        schedule: input.schedule ?? { type: "daily" },
        level: input.level ?? "target",
        activeFrom: today,
        // Omitted entirely when unset, so "no cue" stays distinguishable
        // from "an empty cue" everywhere downstream.
        ...(input.cue ? { cue: input.cue } : {}),
      };
      const list = state.habitsByPillar[pillarId] ?? [];
      persist({
        ...state,
        habitsByPillar: { ...state.habitsByPillar, [pillarId]: [...list, habit] },
      });
    },
    [state, persist, today]
  );

  const editHabit = useCallback(
    (pillarId: PillarId, habitId: string, patch: Partial<Omit<Habit, "id">>) => {
      mutateHabit(pillarId, habitId, (h) => ({ ...h, ...patch, label: patch.label?.trim() || h.label }));
    },
    [mutateHabit]
  );

  const archiveHabit = useCallback(
    (pillarId: PillarId, habitId: string) => {
      mutateHabit(pillarId, habitId, (h) => ({ ...h, archivedAt: today }));
    },
    [mutateHabit, today]
  );

  const restoreHabit = useCallback(
    (pillarId: PillarId, habitId: string) => {
      mutateHabit(pillarId, habitId, (h) => {
        const { archivedAt: _archivedAt, ...rest } = h;
        void _archivedAt;
        return rest as Habit;
      });
    },
    [mutateHabit]
  );

  const pauseHabit = useCallback(
    (pillarId: PillarId, habitId: string, until: string) => {
      mutateHabit(pillarId, habitId, (h) => ({ ...h, pausedUntil: until }));
    },
    [mutateHabit]
  );

  const resumeHabit = useCallback(
    (pillarId: PillarId, habitId: string) => {
      mutateHabit(pillarId, habitId, (h) => {
        const { pausedUntil: _pausedUntil, ...rest } = h;
        void _pausedUntil;
        return rest as Habit;
      });
    },
    [mutateHabit]
  );

  const deleteHabit = useCallback(
    (pillarId: PillarId, habitId: string) => {
      if (!state) return;
      const list = state.habitsByPillar[pillarId] ?? [];
      persist({
        ...state,
        habitsByPillar: { ...state.habitsByPillar, [pillarId]: list.filter((h) => h.id !== habitId) },
      });
    },
    [state, persist]
  );

  const reorderHabits = useCallback(
    (pillarId: PillarId, orderedIds: string[]) => {
      if (!state) return;
      const list = state.habitsByPillar[pillarId] ?? [];
      const byId = new Map(list.map((h) => [h.id, h]));
      const reordered = orderedIds.map((id) => byId.get(id)).filter((h): h is Habit => Boolean(h));
      for (const h of list) if (!orderedIds.includes(h.id)) reordered.push(h);
      persist({ ...state, habitsByPillar: { ...state.habitsByPillar, [pillarId]: reordered } });
    },
    [state, persist]
  );

  const addCommitment = useCallback(
    (input: { text: string; targetDate?: string; targetTime?: string; pillarId?: PillarId; note?: string }) => {
      if (!state || !input.text.trim()) return;
      const commitment = createCommitment(input, nowIso());
      persist({ ...state, commitments: [commitment, ...state.commitments] });
    },
    [state, persist]
  );

  const mutateCommitment = useCallback(
    (id: string, fn: (c: Commitment) => Commitment) => {
      if (!state) return;
      persist({
        ...state,
        commitments: state.commitments.map((c) => (c.id === id ? fn(c) : c)),
      });
    },
    [state, persist]
  );

  const keepCommitment = useCallback(
    (id: string) => mutateCommitment(id, (c) => markKept(c, nowIso())),
    [mutateCommitment]
  );
  const undoKeptCommitment = useCallback((id: string) => mutateCommitment(id, undoKept), [mutateCommitment]);
  const cancelCommitment = useCallback(
    (id: string) => mutateCommitment(id, (c) => domainCancelCommitment(c, nowIso())),
    [mutateCommitment]
  );
  const rescheduleCommitment = useCallback(
    (id: string, next: { targetDate?: string; targetTime?: string }) => {
      if (!state) return;
      const target = state.commitments.find((c) => c.id === id);
      if (!target) return;
      const { updated, created } = domainReschedule(target, nowIso(), next);
      persist({
        ...state,
        commitments: [created, ...state.commitments.map((c) => (c.id === id ? updated : c))],
      });
    },
    [state, persist]
  );
  const deleteCommitment = useCallback(
    (id: string) => {
      if (!state) return;
      persist({ ...state, commitments: state.commitments.filter((c) => c.id !== id) });
    },
    [state, persist]
  );

  const addTransaction = useCallback(
    (input: { type: MoneyTransactionType; amount: number; date: string; note?: string }) => {
      if (!state || !Number.isFinite(input.amount) || input.amount <= 0) return;
      const tx = createTransaction(input, undefined, nowIso());
      persist({ ...state, money: { transactions: [tx, ...state.money.transactions] } });
    },
    [state, persist]
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      if (!state) return;
      persist({ ...state, money: { transactions: state.money.transactions.filter((t) => t.id !== id) } });
    },
    [state, persist]
  );

  const updateMoneySettings = useCallback(
    (patch: Partial<MoneySettings>) => {
      if (!state) return;
      persist({ ...state, settings: { ...state.settings, money: { ...state.settings.money, ...patch } } });
    },
    [state, persist]
  );

  const updateSettings = useCallback(
    (patch: Partial<Pick<TrackerState["settings"], "locale" | "focusTargetMinutes" | "meditationDefaultMinutes">>) => {
      if (!state) return;
      persist({ ...state, settings: { ...state.settings, ...patch } });
    },
    [state, persist]
  );

  /*
    The focus target lives in two places: on the deepWork habit, which is what
    the timer and day-completion actually measure against, and in settings,
    which seeds the target for focus habits created later. Both have to move
    together, and they have to move in a single write — every mutator here
    closes over `state` and persists a whole snapshot, so two called back to
    back in one handler would leave only the second one's change.
  */
  const setFocusTarget = useCallback(
    (minutes: number) => {
      if (!state) return;
      const rounded = Math.max(1, Math.round(minutes));
      const mind = (state.habitsByPillar.mind ?? []).map((h) =>
        h.id === "deepWork" && h.metric.type === "duration"
          ? { ...h, metric: { type: "duration" as const, targetMinutes: rounded } }
          : h
      );
      persist({
        ...state,
        habitsByPillar: { ...state.habitsByPillar, mind },
        settings: { ...state.settings, focusTargetMinutes: rounded },
      });
    },
    [state, persist]
  );

  // --- Timers: timestamp-based so elapsed time survives refresh, tab
  // switches, and backgrounding. See src/domain/timer.ts.
  const startTimer = useCallback(
    (kind: "focus" | "meditation", targetSeconds?: number) => {
      if (!state) return;
      let base = state;
      if (state.timer) base = commitRunningTimer(state);
      const timer: RunningTimerState = {
        kind,
        startedAt: nowIso(),
        accumulatedSeconds: 0,
        dateKey: today,
        targetSeconds,
      };
      persist({ ...base, timer });
    },
    [state, persist, today]
  );

  const stopTimer = useCallback(() => {
    if (!state || !state.timer) return;
    persist(commitRunningTimer(state));
  }, [state, persist]);

  const timerElapsedSeconds = useCallback(
    (nowMs: number) => (state?.timer ? elapsedSeconds(state.timer, nowMs) : 0),
    [state]
  );

  // Safety-net commit every 15s while a timer runs, so a crash/close mid
  // session loses at most ~15s instead of the whole session. Timestamp-based
  // math means this can never double-count or drift.
  useEffect(() => {
    if (!state?.timer) return;
    const interval = setInterval(() => {
      setState((prev) => {
        if (!prev?.timer) return prev;
        const committed = commitRunningTimer(prev, { keepRunning: true });
        writeQueue.push(committed);
        return committed;
      });
    }, TIMER_SAFETY_FLUSH_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.timer?.startedAt, state?.timer?.kind]);

  // Meditation auto-completes when its countdown target is reached.
  useEffect(() => {
    const timer = state?.timer;
    if (!timer || timer.kind !== "meditation" || !timer.targetSeconds) return;
    const check = () => {
      setState((prev) => {
        if (!prev?.timer || prev.timer.kind !== "meditation" || !prev.timer.targetSeconds) return prev;
        if (elapsedSeconds(prev.timer, Date.now()) < prev.timer.targetSeconds) return prev;
        const committed = commitRunningTimer(prev);
        const day = committed.days[prev.timer.dateKey] ?? emptyDay();
        const withHabit = {
          ...committed,
          days: {
            ...committed.days,
            [prev.timer.dateKey]: { ...day, habits: { ...day.habits, meditation: true } },
          },
        };
        writeQueue.push(withHabit);
        return withHabit;
      });
    };
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, [state?.timer, writeQueue]);

  const exportBackup = useCallback(() => {
    if (!state) return;
    exportBackupToFile(state, nowIso());
  }, [state]);

  const previewImportFile = useCallback((text: string) => previewImport(text), []);

  /*
    Import goes straight to the server and waits for it, rather than through the
    write queue. The queue is fire-and-forget by design, and replacing the whole
    vault is the one operation where the user has to be told it landed before
    the UI claims it did — the server validates the document again and leaves
    the previous one untouched if it fails.
  */
  const confirmImport = useCallback(async (candidate: TrackerState) => {
    try {
      await putState(candidate);
      setState(candidate);
      setIsUnlocked(true);
      setLoadStatus("ready");
      return { ok: true as const };
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : "The import could not be saved." };
    }
  }, []);

  const dayNumber = useMemo(() => {
    if (!state) return 1;
    return getJourneyWindow(state.dayOneDate, today).dayNumber;
  }, [state, today]);

  const journey = useMemo(
    () => (state ? getJourneyWindow(state.dayOneDate, today) : getJourneyWindow(today, today)),
    [state, today]
  );

  const streak = useMemo(() => {
    if (!state) return 0;
    return calcStreak(state, journey.effectiveToday);
  }, [state, journey.effectiveToday]);

  const habitRisks = useMemo(
    () => (state ? computeAllHabitRisks(state, journey.effectiveToday) : []),
    [state, journey.effectiveToday]
  );

  const habitStrengths = useMemo(
    () =>
      state
        ? computeAllHabitStrengths(
            flattenHabits(state.habitsByPillar).filter((h) => !h.archivedAt),
            state.days,
            state.dayOneDate,
            journey.effectiveToday
          )
        : [],
    [state, journey.effectiveToday]
  );

  const dayRecovery = useMemo(
    () => (state ? computeDayRecovery(state, journey.effectiveToday) : null),
    [state, journey.effectiveToday]
  );

  const insights = useMemo(() => {
    if (!state) return [];
    return computeInsights({
      analytics: computeAnalytics(state, journey.effectiveToday),
      risks: habitRisks,
      strengths: habitStrengths,
      habits: flattenHabits(state.habitsByPillar),
      commitments: state.commitments,
      todayKey: journey.effectiveToday,
    });
  }, [state, journey.effectiveToday, habitRisks, habitStrengths]);

  const value: TrackerContextValue = {
    loadStatus,
    hasAccount: state !== null,
    isUnlocked,
    today,
    dayNumber,
    totalJourneyDays: journey.totalDays,
    daysRemaining: journey.daysRemaining,
    journeyProgressPct: journey.progressPct,
    streak,
    state,
    journalSaveStatus,
    corruptedBackupKey,
    saveStatus,
    createAccount,
    unlock,
    lock,
    getDayRecord,
    toggleCheckboxHabit,
    setHabitValue,
    setSpecialDay,
    setIntention,
    setReflection,
    setJournal,
    toggleJournalFavorite,
    addHabit,
    editHabit,
    archiveHabit,
    restoreHabit,
    pauseHabit,
    resumeHabit,
    deleteHabit,
    reorderHabits,
    addCommitment,
    keepCommitment,
    undoKeptCommitment,
    cancelCommitment,
    rescheduleCommitment,
    deleteCommitment,
    addTransaction,
    deleteTransaction,
    updateMoneySettings,
    setFocusTarget,
    insights,
    habitRisks,
    habitStrengths,
    dayRecovery,
    timer: state?.timer ?? null,
    startTimer,
    stopTimer,
    timerElapsedSeconds,
    updateSettings,
    exportBackup,
    previewImportFile,
    confirmImport,
  };

  return <TrackerContext.Provider value={value}>{children}</TrackerContext.Provider>;
}

const JOURNAL_COMPLETE_THRESHOLD = 3;

/** Folds a running timer's elapsed time into its day's totals. With
 * `keepRunning`, resets the running segment's baseline (startedAt=now,
 * accumulatedSeconds=0) instead of clearing the timer — used by the periodic
 * safety flush so the session keeps running after each commit. */
function commitRunningTimer(state: TrackerState, opts: { keepRunning?: boolean } = {}): TrackerState {
  const timer = state.timer;
  if (!timer) return state;
  const elapsed = elapsedSeconds(timer, Date.now());
  const day = state.days[timer.dateKey] ?? emptyDay();
  const field = timer.kind === "focus" ? "focusSeconds" : "meditationSeconds";
  const nextDay: DayRecord = { ...day, [field]: (day[field] ?? 0) + elapsed };
  return {
    ...state,
    days: { ...state.days, [timer.dateKey]: nextDay },
    timer: opts.keepRunning ? { ...timer, startedAt: new Date().toISOString(), accumulatedSeconds: 0 } : null,
  };
}

export function useTracker(): TrackerContextValue {
  const ctx = useContext(TrackerContext);
  if (!ctx) throw new Error("useTracker must be used within TrackerProvider");
  return ctx;
}

export { BackupImportError };
export type { CommitmentStatus };
