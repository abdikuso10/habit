"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

export function HabitCheckbox({
  id,
  label,
  jp,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  jp?: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-3 py-1.5 select-none"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-white/20 bg-night transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-gold"
        style={{
          backgroundColor: checked ? "var(--color-green)" : undefined,
          borderColor: checked ? "var(--color-green)" : undefined,
        }}
      >
        {checked && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex items-center justify-center text-night"
          >
            <Check size={14} strokeWidth={3} />
          </motion.span>
        )}
      </span>
      <span
        className={`text-sm transition-colors ${
          checked ? "text-slate line-through decoration-slate/50" : "text-parchment"
        }`}
      >
        {label}
        {jp && <span className="ml-2 text-xs text-slate/70">{jp}</span>}
      </span>
    </label>
  );
}
