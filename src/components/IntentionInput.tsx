"use client";

import { useState } from "react";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { useTracker } from "@/providers/TrackerProvider";

export function IntentionInput() {
  const { today, getDayRecord, setIntention } = useTracker();
  const [value, setValue] = useState(() => getDayRecord(today).intention ?? "");
  const commit = useDebouncedCallback((text: string) => setIntention(today, text), 600);

  return (
    <div>
      <label htmlFor="intention" className="mb-1.5 block text-xs text-slate">
        One intention for today
      </label>
      <input
        id="intention"
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          commit(e.target.value);
        }}
        placeholder="What matters most today?"
        className="w-full rounded-lg border border-white/10 bg-night px-3.5 py-2.5 text-sm text-parchment placeholder:text-slate/60 outline-none focus-visible:ring-2 focus-visible:ring-gold"
      />
    </div>
  );
}
