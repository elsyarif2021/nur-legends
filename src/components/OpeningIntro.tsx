import { useEffect, useRef, useState } from 'react';
import { StarEmblem } from './GeometricOrnament';

const SESSION_KEY = 'nur_opening_seen';
const INTRO_DURATION_MS = 1600;

function shouldShowIntro(): boolean {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (typeof window.HTMLDialogElement?.prototype.showModal !== 'function') return false;
  try {
    return sessionStorage.getItem(SESSION_KEY) !== '1';
  } catch {
    return true;
  }
}

export function OpeningIntro() {
  const [show, setShow] = useState(shouldShowIntro);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      // The opening can still run when session storage is unavailable.
    }
    const timer = window.setTimeout(() => dialog.close(), INTRO_DURATION_MS);
    return () => {
      window.clearTimeout(timer);
      if (dialog.open) dialog.close();
    };
  }, [show]);

  if (!show) return null;

  return (
    <dialog
      ref={dialogRef}
      className="nur-intro"
      aria-label="Pembuka NUR LEGENDS"
      onClose={() => setShow(false)}
    >
      <div className="nur-intro-brand">
        <div className="nur-intro-emblem"><StarEmblem className="h-full w-full" color="#f4dfa0" /></div>
        <div className="font-display text-[clamp(2rem,8vw,4.75rem)] font-bold leading-none text-[#f4dfa0]">NUR LEGENDS</div>
        <div className="mt-3 text-xs font-medium uppercase tracking-[.28em] text-teal-100 sm:text-sm">Guardians of Light</div>
      </div>
      <button type="button" className="nur-intro-skip" onClick={() => dialogRef.current?.close()}>
        Lewati
      </button>
    </dialog>
  );
}
