import { useEffect, useRef, useState } from 'react';
import { useAudioPrefs } from '../audio/retroSynth';
import { portfolioData } from '../data/portfolioData';
import { PixelIcon } from './BottomDock';

interface Props {
  onOpenCv: () => void;
}

const NOTE = ['......##..', '......###.', '......#.##', '......#..#', '......#...', '......#...', '..####....', '.#####....', '.#####....', '..###.....'];
const SPEAKER = ['....#.....', '...##...#.', '####.#.#..', '#..#.#..#.', '#..#.#..#.', '####.#.#..', '...##...#.', '....#.....', '..........', '..........'];
const SPEAKER_OFF = ['....#.....', '...##.....', '####.#.#.#', '#..#.#..#.', '#..#.#.#.#', '####.#....', '...##.....', '....#.....', '..........', '..........'];

/** Tiny animated equaliser shown while the music plays. */
function Eq() {
  return (
    <span className="ml-1 hidden h-3 items-end gap-[2px] sm:flex" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block h-3 w-[3px] origin-bottom bg-current"
          style={{ animation: `eq ${0.9 + i * 0.25}s ease-in-out ${i * 0.15}s infinite` }}
        />
      ))}
    </span>
  );
}

export default function Header({ onOpenCv }: Props) {
  const [help, setHelp] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);

  // Close the popover on outside click or Escape.
  useEffect(() => {
    if (!help) return;
    const onPointer = (e: PointerEvent) => {
      if (!helpRef.current?.contains(e.target as Node)) setHelp(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHelp(false);
    };
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [help]);
  const { bgmOn, bgmPlaying, sfxOn, toggleBgm, toggleSfx } = useAudioPrefs();
  const { profile } = portfolioData;

  const toggleClass = (on: boolean) =>
    `pixel-btn flex h-9 items-center justify-center gap-1 rounded-[5px] px-2 text-sm sm:px-2.5 ${
      on ? 'bg-[#8fae8b] text-ink' : 'bg-[#3a2a33] text-parchment/55'
    }`;

  return (
    <header className="relative z-30 flex items-center gap-2 px-3 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] sm:gap-3 sm:px-5 sm:pt-3">
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-pixel text-xl leading-tight text-parchment sm:text-2xl">
          <span className="text-rose-soft">Nasywa</span>’s Cabin
        </h1>
        <p className="truncate text-xs text-parchment/60 sm:text-sm [@media(max-height:500px)]:hidden">
          {profile.fullName}, {profile.headline.toLowerCase()}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2" role="group" aria-label="Audio">
        <button
          type="button"
          data-audio-toggle
          onClick={toggleBgm}
          aria-pressed={bgmOn && bgmPlaying}
          aria-label={bgmOn && bgmPlaying ? 'Turn background music off' : 'Play background music'}
          title={bgmOn && bgmPlaying ? 'Background music: on' : 'Background music: off'}
          className={toggleClass(bgmOn && bgmPlaying)}
        >
          <PixelIcon cells={NOTE} className="h-4 w-4" />
          <span className="hidden md:inline">BGM</span>
          {bgmOn && bgmPlaying && <Eq />}
        </button>
        <button
          type="button"
          data-audio-toggle
          onClick={toggleSfx}
          aria-pressed={sfxOn}
          aria-label={sfxOn ? 'Turn sound effects off' : 'Turn sound effects on'}
          title={sfxOn ? 'Sound effects: on' : 'Sound effects: off'}
          className={toggleClass(sfxOn)}
        >
          <PixelIcon cells={sfxOn ? SPEAKER : SPEAKER_OFF} className="h-4 w-4" />
          <span className="hidden md:inline">SFX</span>
        </button>
      </div>

      {/* Anchor: the popover is absolutely positioned against this wrapper, so it never affects layout. */}
      <div ref={helpRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setHelp((h) => !h)}
          aria-expanded={help}
          aria-controls="controls-help"
          className="pixel-btn h-9 w-9 rounded-[5px] bg-[#5b3a29] text-base text-parchment"
          aria-label="How to explore the cabin"
        >
          ?
        </button>
        {help && (
          <div
            id="controls-help"
            role="dialog"
            aria-label="How to explore"
            className="rpg-frame anim-pop absolute right-0 top-full z-40 mt-3 w-72 max-w-[calc(100vw-1.5rem)] p-3 pt-4 text-sm leading-relaxed text-parchment"
          >
            <span
              aria-hidden="true"
              className="absolute -top-[9px] right-[11px] h-3 w-3 rotate-45 border-l-4 border-t-4 border-gold bg-[#3a2230]"
            />
            <p className="mb-1.5 font-pixel text-gold">How to explore</p>
            <ul className="space-y-1 text-parchment/85">
              <li>Click or tap the floor to walk there.</li>
              <li>Click furniture to walk over and open it.</li>
              <li>WASD or arrow keys move; Enter or Space interacts.</li>
              <li>Keys 1 to 5 jump to each station.</li>
              <li>On touch screens, use the D-pad and the A button.</li>
              <li>The cats are asleep, but they don’t mind a gentle pat.</li>
              <li>BGM and SFX switch the music and sound effects.</li>
            </ul>
          </div>
        )}
      </div>

      <button type="button" onClick={onOpenCv} className="pixel-btn h-9 shrink-0 rounded-[5px] bg-gold px-3 text-sm font-semibold text-ink sm:px-4">
        <span className="sm:hidden">CV</span>
        <span className="hidden sm:inline">Recruiter fast-view</span>
      </button>
    </header>
  );
}
