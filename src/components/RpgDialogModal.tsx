import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { synth } from '../audio/retroSynth';
import { portfolioData, stationById, type StationId } from '../data/portfolioData';
import { spriteUrl } from '../pixel/painters';
import { NASYWA_PORTRAIT } from '../pixel/sprites';

interface Props {
  station: StationId | null;
  onClose: () => void;
  children: ReactNode;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Types text out letter by letter with a soft blip, like a classic RPG text box. */
function useTypewriter(text: string, active: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    if (prefersReducedMotion()) {
      setCount(text.length);
      return;
    }
    setCount(0);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setCount(i);
      if (i % 3 === 0 && text[i] !== ' ') synth.blip();
      if (i >= text.length) window.clearInterval(id);
    }, 22);
    return () => window.clearInterval(id);
  }, [text, active]);
  return { shown: text.slice(0, count), done: count >= text.length, skip: () => setCount(text.length) };
}

export default function RpgDialogModal({ station, onClose, children }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const meta = station ? stationById(station) : null;
  const title = station === 'polaroids' ? portfolioData.highlights.title : meta?.dialogTitle ?? '';
  const { shown, done, skip } = useTypewriter(meta?.speech ?? '', Boolean(station));
  const portrait = useMemo(() => spriteUrl('n-portrait', NASYWA_PORTRAIT), []);

  // Focus management + Escape + simple focus trap
  useEffect(() => {
    if (!station) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      // Return focus for keyboard users, but not to invisible room hit-areas.
      if (previous && !previous.closest('[role="application"]')) previous.focus({ preventScroll: true });
    };
  }, [station, onClose]);

  if (!station || !meta) return null;

  return (
    <div
      className="anim-fade fixed inset-0 z-50 flex items-end justify-center bg-[#0d0609]/70 p-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] backdrop-blur-[2px] sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rpg-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="rpg-frame anim-pop flex max-h-[86dvh] w-full max-w-3xl flex-col overflow-hidden"
      >
        {/* Title bar */}
        <div className="flex items-center justify-between gap-3 border-b-2 border-gold-dark/70 bg-[#4a2a1c]/60 px-4 py-2.5">
          <h2 id="rpg-dialog-title" className="flex items-center gap-2 font-pixel text-lg text-gold-light sm:text-xl">
            <span className="flex h-6 w-6 items-center justify-center rounded-[3px] bg-gold text-sm text-ink shadow-[inset_-2px_-2px_0_rgba(0,0,0,0.25)]">
              {meta.number}
            </span>
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="pixel-btn flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] bg-rose-soft text-base font-bold text-ink"
          >
            ✕
          </button>
        </div>

        {/* Speech box */}
        <button
          type="button"
          onClick={skip}
          className="focus-ring flex items-start gap-3 border-b-2 border-gold-dark/40 bg-[#1f1219] px-4 py-3 text-left"
          aria-label={done ? meta.speech : 'Show the full line'}
        >
          <div className="relative flex h-[68px] w-[68px] shrink-0 items-end justify-center overflow-hidden rounded-[4px] border-2 border-gold-dark bg-gradient-to-b from-[#3a2a5c] via-[#6b4a6e] to-[#e7a0b4] shadow-[inset_0_0_0_2px_rgba(0,0,0,0.25)]">
            <span className="absolute left-2 top-2 h-1 w-1 bg-[#fff6d0]" aria-hidden="true" />
            <span className="absolute right-3 top-4 h-1 w-1 bg-[#c9c3ff]" aria-hidden="true" />
            <img src={portrait} alt="Portrait of Nasywa" className="pixelated relative h-16 w-16 max-w-none" />
          </div>
          <div className="min-w-0">
            <p className="font-pixel text-sm text-rose-soft">{portfolioData.profile.nickname}</p>
            <p className="min-h-[2.75rem] font-pixel text-[15px] leading-snug text-parchment sm:text-base" aria-live="polite">
              {shown}
              {!done && <span className="ml-0.5 inline-block animate-pulse text-gold">▌</span>}
              {done && <span className="ml-1 inline-block text-gold" style={{ animation: 'cursorBlink 0.9s steps(1) infinite' }}>▼</span>}
            </p>
          </div>
        </button>

        {/* Content */}
        <div className="scroll-cozy min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">{children}</div>
      </div>
    </div>
  );
}
