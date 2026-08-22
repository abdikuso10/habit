"use client";

import { useEffect, useId, useRef } from "react";

/** Accessible modal built on the native <dialog> element: it handles focus
 * trapping, Escape-to-close, and focus return to the trigger for free. */
export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    // Guarded rather than assumed: showModal/close are unsupported in a few
    // older/embedded WebViews (and in jsdom under tests), so degrade to the
    // plain `open` attribute there instead of throwing.
    if (open && !node.open) {
      if (typeof node.showModal === "function") node.showModal();
      else node.setAttribute("open", "");
    }
    if (!open && node.open) {
      if (typeof node.close === "function") node.close();
      else node.removeAttribute("open");
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="w-[min(92vw,32rem)] rounded-2xl border border-white/10 bg-panel p-0 text-parchment backdrop:bg-night/80 open:animate-none"
    >
      <div className="flex items-center justify-between border-b border-white/10 p-4">
        <h2 id={titleId} className="font-display text-lg text-parchment">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="rounded p-1.5 text-slate transition hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          ✕
        </button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}
