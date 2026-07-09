"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { sha256Hex } from "./crypto";
import { calcStreak, completionPct } from "./completion";
import { daysBetween, todayKey as getTodayKey } from "./date";
import { defaultHabitsByPillar, flattenHabits, PillarId } from "./habits";
import {
  BackupImportError,
  exportBackup as exportBackupFile,
  loadState,
  parseBackupFile,
  saveState,
} from "./storage";
import { DayRecord, STARTING_DEBT, TrackerState } from "./types";

const ROLLOVER_CHECK_MS = 30_000;

interface TrackerContextValue {
  isLoading: boolean;
  hasAccount: boolean;
  isUnlocked: boolean;
  today: string;
  dayNumber: number;
  streak: number;
  state: TrackerState | null;
  createAccount: (password: string, dayOneDate: string) => Promise<void>;
  unlock: (password: string) => Promise<boolean>;
  lock: () => void;
  getDayRecord: (dateKey: string) => DayRecord;
  getCompletionPct: (dateKey: string) => number;
  toggleHabit: (dateKey: string, habitId: string) => void;
  setHabitDone: (dateKey: string, habitId: string) => void;
  setJournal: (dateKey: string, text: string) => void;
  addSavings: (amount: number) => void;
  payDebt: (amount: number) => void;
  addHabit: (pillarId: PillarId, label: string) => void;
  editHabit: (pillarId: PillarId, habitId: string, label: string) => void;
  deleteHabit: (pillarId: PillarId, habitId: string) => void;
  exportBackup: () => void;
  importBackup: (text: string) => void;
}

const TrackerContext = createContext<TrackerContextValue | null>(null);

const emptyDay = (): DayRecord => ({ habits: {}, journal: "" });

export function TrackerProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [state, setState] = useState<TrackerState | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [today, setToday] = useState(getTodayKey());

  useEffect(() => {
    // One-time read from localStorage (an external system) after mount, so
    // server-rendered and first-client-render HTML match before hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(loadState());
    setIsLoading(false);
  }, []);

  // Recompute "today" periodically so day number, checklist, and grid roll
  // over at midnight without requiring a manual refresh.
  useEffect(() => {
    const interval = setInterval(() => {
      setToday(getTodayKey());
    }, ROLLOVER_CHECK_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible") setToday(getTodayKey());
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const persist = useCallback((next: TrackerState) => {
    setState(next);
    saveState(next);
  }, []);

  const createAccount = useCallback(
    async (password: string, dayOneDate: string) => {
      const passwordHash = await sha256Hex(password);
      const next: TrackerState = {
        version: 4,
        passwordHash,
        dayOneDate,
        savingsTotal: 0,
        debtRemaining: STARTING_DEBT,
        habitsByPillar: defaultHabitsByPillar(),
        days: {},
      };
      persist(next);
      setIsUnlocked(true);
    },
    [persist]
  );

  const unlock = useCallback(
    async (password: string) => {
      if (!state) return false;
      const hash = await sha256Hex(password);
      const ok = hash === state.passwordHash;
      if (ok) setIsUnlocked(true);
      return ok;
    },
    [state]
  );

  const lock = useCallback(() => setIsUnlocked(false), []);

  const habitIds = useMemo(
    () => (state ? flattenHabits(state.habitsByPillar).map((h) => h.id) : []),
    [state]
  );

  const getDayRecord = useCallback(
    (dateKey: string): DayRecord => state?.days[dateKey] ?? emptyDay(),
    [state]
  );

  const getCompletionPct = useCallback(
    (dateKey: string): number => completionPct(state?.days[dateKey], habitIds),
    [state, habitIds]
  );

  const toggleHabit = useCallback(
    (dateKey: string, habitId: string) => {
      if (!state) return;
      const day = state.days[dateKey] ?? emptyDay();
      const nextDay: DayRecord = {
        ...day,
        habits: { ...day.habits, [habitId]: !day.habits[habitId] },
      };
      persist({
        ...state,
        days: { ...state.days, [dateKey]: nextDay },
      });
    },
    [state, persist]
  );

  const setHabitDone = useCallback(
    (dateKey: string, habitId: string) => {
      if (!state) return;
      const day = state.days[dateKey] ?? emptyDay();
      const nextDay: DayRecord = {
        ...day,
        habits: { ...day.habits, [habitId]: true },
      };
      persist({
        ...state,
        days: { ...state.days, [dateKey]: nextDay },
      });
    },
    [state, persist]
  );

  const setJournal = useCallback(
    (dateKey: string, text: string) => {
      if (!state) return;
      const day = state.days[dateKey] ?? emptyDay();
      const nextDay: DayRecord = {
        ...day,
        journal: text,
        habits: {
          ...day.habits,
          journal: text.trim().length > 3 ? true : day.habits.journal,
        },
      };
      persist({
        ...state,
        days: { ...state.days, [dateKey]: nextDay },
      });
    },
    [state, persist]
  );

  const addSavings = useCallback(
    (amount: number) => {
      if (!state || !Number.isFinite(amount) || amount <= 0) return;
      persist({ ...state, savingsTotal: state.savingsTotal + amount });
    },
    [state, persist]
  );

  const payDebt = useCallback(
    (amount: number) => {
      if (!state || !Number.isFinite(amount) || amount <= 0) return;
      persist({
        ...state,
        debtRemaining: Math.max(0, state.debtRemaining - amount),
      });
    },
    [state, persist]
  );

  const addHabit = useCallback(
    (pillarId: PillarId, label: string) => {
      if (!state || !label.trim()) return;
      const id =
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `habit-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const pillarHabits = state.habitsByPillar[pillarId] ?? [];
      persist({
        ...state,
        habitsByPillar: {
          ...state.habitsByPillar,
          [pillarId]: [...pillarHabits, { id, label: label.trim() }],
        },
      });
    },
    [state, persist]
  );

  const editHabit = useCallback(
    (pillarId: PillarId, habitId: string, label: string) => {
      if (!state || !label.trim()) return;
      const pillarHabits = state.habitsByPillar[pillarId] ?? [];
      persist({
        ...state,
        habitsByPillar: {
          ...state.habitsByPillar,
          [pillarId]: pillarHabits.map((h) =>
            h.id === habitId ? { ...h, label: label.trim() } : h
          ),
        },
      });
    },
    [state, persist]
  );

  const deleteHabit = useCallback(
    (pillarId: PillarId, habitId: string) => {
      if (!state) return;
      const pillarHabits = state.habitsByPillar[pillarId] ?? [];
      persist({
        ...state,
        habitsByPillar: {
          ...state.habitsByPillar,
          [pillarId]: pillarHabits.filter((h) => h.id !== habitId),
        },
      });
    },
    [state, persist]
  );

  const exportBackup = useCallback(() => {
    if (!state) return;
    exportBackupFile(state);
  }, [state]);

  const importBackup = useCallback(
    (text: string) => {
      const imported = parseBackupFile(text);
      persist(imported);
      setIsUnlocked(true);
    },
    [persist]
  );

  const dayNumber = useMemo(() => {
    if (!state) return 1;
    const diff = daysBetween(state.dayOneDate, today) + 1;
    return Math.min(365, Math.max(1, diff));
  }, [state, today]);

  const streak = useMemo(() => {
    if (!state) return 0;
    return calcStreak(state, today);
  }, [state, today]);

  const value: TrackerContextValue = {
    isLoading,
    hasAccount: state !== null,
    isUnlocked,
    today,
    dayNumber,
    streak,
    state,
    createAccount,
    unlock,
    lock,
    getDayRecord,
    getCompletionPct,
    toggleHabit,
    setHabitDone,
    setJournal,
    addSavings,
    payDebt,
    addHabit,
    editHabit,
    deleteHabit,
    exportBackup,
    importBackup,
  };

  return (
    <TrackerContext.Provider value={value}>
      {children}
    </TrackerContext.Provider>
  );
}

export function useTracker(): TrackerContextValue {
  const ctx = useContext(TrackerContext);
  if (!ctx) throw new Error("useTracker must be used within TrackerProvider");
  return ctx;
}

export { BackupImportError };
