"use client";

import { useEffect, useRef } from "react";

type Props = { open: boolean; onClose: () => void; title: string; closeLabel: string; alt: string };

/** The printed invitation, full size, in a native modal dialog. */
export default function CardDialog({ open, onClose, title, closeLabel, alt }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="card-dialog"
      aria-label={title}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      <div className="card-dialog__inner">
        <button type="button" className="card-dialog__close" onClick={onClose} autoFocus>
          <span>{closeLabel}</span>
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
        {open && (
          <img className="card-dialog__img" src="/invitation-card" width={943} height={1200} alt={alt} decoding="async" />
        )}
      </div>
    </dialog>
  );
}
