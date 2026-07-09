"use client";

import { Check, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import { HabitCheckbox } from "./HabitCheckbox";

export function HabitRow({
  id,
  label,
  jp,
  checked,
  onToggle,
  onEdit,
  onDelete,
}: {
  id: string;
  label: string;
  jp?: string;
  checked: boolean;
  onToggle: () => void;
  onEdit: (label: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);

  function save() {
    if (draft.trim()) onEdit(draft.trim());
    setEditing(false);
  }

  function cancel() {
    setDraft(label);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-1.5">
        <input
          autoFocus
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          className="min-w-0 flex-1 rounded-md border border-white/10 bg-night px-2 py-1 text-sm text-parchment outline-none focus-visible:ring-2 focus-visible:ring-gold"
        />
        <button
          type="button"
          onClick={save}
          aria-label="Save"
          className="shrink-0 rounded p-1 text-green hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          <Check size={15} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={cancel}
          aria-label="Cancel"
          className="shrink-0 rounded p-1 text-slate hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          <X size={15} strokeWidth={2.5} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 py-0.5">
      <div className="min-w-0 flex-1">
        <HabitCheckbox
          id={id}
          label={label}
          jp={jp}
          checked={checked}
          onChange={onToggle}
        />
      </div>
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={`Edit ${label}`}
        className="shrink-0 rounded p-1.5 text-slate/60 transition hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        <Pencil size={13} />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete ${label}`}
        className="shrink-0 rounded p-1.5 text-slate/60 transition hover:text-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
