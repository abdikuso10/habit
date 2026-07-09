"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useTracker } from "@/lib/TrackerContext";

export function LockScreen() {
  const { unlock } = useTracker();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setChecking(true);
    setError("");
    const ok = await unlock(password);
    setChecking(false);
    if (!ok) {
      setError("That password doesn't match.");
      setPassword("");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <p className="font-arabic text-2xl text-gold mb-2">يوم واحد</p>
          <h1 className="font-display text-3xl text-parchment">
            Yawm Wahid
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/10 bg-panel p-6 sm:p-8 space-y-5"
        >
          <div>
            <label
              htmlFor="unlock-password"
              className="block text-sm text-slate mb-1.5"
            >
              Password
            </label>
            <input
              id="unlock-password"
              type="password"
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-night px-3.5 py-2.5 text-parchment outline-none focus-visible:ring-2 focus-visible:ring-gold"
            />
          </div>

          {error && (
            <p className="text-sm text-clay" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={checking || password.length === 0}
            className="w-full rounded-lg bg-gold px-4 py-2.5 font-medium text-night transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-panel disabled:opacity-60"
          >
            Unlock
          </button>
        </form>
      </motion.div>
    </main>
  );
}
