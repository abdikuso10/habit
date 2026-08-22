"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { daysBetween, formatFullDate, JOURNEY_END_DATE, todayKey } from "@/domain/date";
import { useTracker } from "@/providers/TrackerProvider";

/* Mirrors the server's rule in src/app/api/auth/setup/route.ts — a client
   minimum lower than the server's just produces a rejected request. */
const MIN_PASSWORD_LENGTH = 8;

export function SetupScreen() {
  const { createAccount } = useTracker();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [dayOneDate, setDayOneDate] = useState(todayKey());
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Choose a password with at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (!dayOneDate || daysBetween(dayOneDate, JOURNEY_END_DATE) < 0) {
      setError(`Choose a start date on or before ${formatFullDate(JOURNEY_END_DATE)}.`);
      return;
    }

    setSubmitting(true);
    try {
      await createAccount(password, dayOneDate);
    } catch (error) {
      // Setup writes to the database, so it can fail for reasons that have
      // nothing to do with what was typed.
      setError(error instanceof Error ? error.message : "Couldn't create your vault. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <p className="font-arabic text-2xl text-gold mb-2">يوم واحد</p>
          <h1 className="font-display text-3xl text-parchment">
            Yawm Wahid
          </h1>
          <p className="mt-2 text-sm text-slate">
            Day One. Set a password and choose the date this begins.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/10 bg-panel p-6 sm:p-8 space-y-5"
        >
          <div>
            <label
              htmlFor="password"
              className="block text-sm text-slate mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-night px-3.5 py-2.5 text-parchment placeholder:text-slate/60 outline-none focus-visible:ring-2 focus-visible:ring-gold"
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            />
          </div>

          <div>
            <label
              htmlFor="confirm"
              className="block text-sm text-slate mb-1.5"
            >
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-night px-3.5 py-2.5 text-parchment placeholder:text-slate/60 outline-none focus-visible:ring-2 focus-visible:ring-gold"
              placeholder="Type it again"
            />
          </div>

          <div>
            <label
              htmlFor="dayOne"
              className="block text-sm text-slate mb-1.5"
            >
              Day One date
            </label>
            <input
              id="dayOne"
              type="date"
              value={dayOneDate}
              max={JOURNEY_END_DATE}
              onChange={(e) => setDayOneDate(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-night px-3.5 py-2.5 text-parchment outline-none focus-visible:ring-2 focus-visible:ring-gold [color-scheme:dark]"
            />
          </div>

          <div className="rounded-xl border border-gold/20 bg-gold/5 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-gold">Finish line</p>
            <p className="mt-1 text-sm text-parchment">Friday, 9 July 2027</p>
            <p className="mt-1 text-xs text-slate">Every day from your start date through the finish is included.</p>
          </div>

          {error && (
            <p className="text-sm text-clay" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-gold px-4 py-2.5 font-medium text-night transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-panel disabled:opacity-60"
          >
            Begin
          </button>

          <p className="text-xs leading-relaxed text-slate/80">
            This password is hashed on the server and checked there, so it
            actually guards your data rather than just hiding it. Your entries
            are stored in the database, not on this device — keep an exported
            backup, and remember there is no way to reset a password you forget.
          </p>
        </form>
      </motion.div>
    </main>
  );
}
