import { portfolioData, type StationId } from '../data/portfolioData';

interface Props {
  active: StationId | null;
  onSelect: (id: StationId) => void;
  lampOn: boolean;
  onToggleLamp: () => void;
}

/** Pixel icons drawn on a 10x10 grid. */
function PixelIcon({ cells, className = '' }: { cells: string[]; className?: string }) {
  return (
    <svg viewBox="0 0 10 10" className={`h-5 w-5 shrink-0 ${className}`} shapeRendering="crispEdges" aria-hidden="true">
      {cells.flatMap((row, y) =>
        row.split('').map((c, x) => (c === '#' ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" /> : null)),
      )}
    </svg>
  );
}

const ICONS: Record<StationId | 'lamp', string[]> = {
  nasywa: ['...####...', '..######..', '.##....##.', '.#.#..#.#.', '.#......#.', '..#....#..', '...####...', '.########.', '##########', '##########'],
  desk: ['##########', '#........#', '#.##.###.#', '#........#', '#.###.##.#', '##########', '....##....', '..######..', '..........', '##########'],
  bookshelf: ['##########', '#.#.##.#.#', '#.#.##.#.#', '##########', '#.##.#.#.#', '#.##.#.#.#', '##########', '#.#.#.##.#', '#.#.#.##.#', '##########'],
  polaroids: ['#........#', '.##....##.', '..######..', '.#....#...', '.#.##.#...', '.#....#...', '.######...', '......####', '......#..#', '......####'],
  coffee: ['..#..#....', '...#..#...', '..........', '.######...', '.#....###.', '.#....#.#.', '.#....###.', '.######...', '..####....', '##########'],
  lamp: ['..######..', '.########.', '##########', '....##....', '....##....', '....##....', '....##....', '....##....', '..######..', '..........'],
};

export { PixelIcon };

export default function BottomDock({ active, onSelect, lampOn, onToggleLamp }: Props) {
  return (
    <nav
      aria-label="Cabin stations"
      className="relative z-20 border-t-4 border-[#140b0f] bg-gradient-to-b from-[#5b3a29] to-[#3a2419] px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[inset_0_2px_0_#7a4e35]"
    >
      <div className="mx-auto flex max-w-4xl items-stretch gap-1.5 sm:gap-2">
        <ul className="grid flex-1 grid-cols-5 gap-1.5 sm:gap-2">
          {portfolioData.stations.map((s) => {
            const isActive = active === s.id;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onSelect(s.id)}
                  aria-current={isActive ? 'true' : undefined}
                  title={`${s.dialogTitle} (key ${s.number})`}
                  className={`pixel-btn flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-[5px] px-1 py-1.5 sm:flex-row sm:gap-2 sm:px-3 sm:py-2 [@media(max-height:500px)]:py-1 ${
                    isActive ? 'bg-rose-soft text-ink' : 'bg-[#5b3a29] text-parchment hover:bg-[#6e452f]'
                  }`}
                >
                  <PixelIcon cells={ICONS[s.id]} className={isActive ? 'text-ink' : 'text-amber-glow'} />
                  <span className="whitespace-nowrap text-[11px] leading-none sm:text-sm">
                    <span className="hidden text-gold-light/70 lg:inline">{s.number}. </span>
                    <span className="sm:hidden">{s.shortLabel}</span>
                    <span className="hidden sm:inline">{s.dockLabel}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onToggleLamp}
            aria-pressed={lampOn}
            aria-label={lampOn ? 'Turn lamps off' : 'Turn lamps on'}
            title={lampOn ? 'Turn lamps off' : 'Turn lamps on'}
            className={`pixel-btn flex w-11 items-center justify-center rounded-[5px] sm:w-12 ${lampOn ? 'bg-amber-glow text-ink' : 'bg-[#3a2a33] text-parchment/60'}`}
          >
            <PixelIcon cells={ICONS.lamp} />
          </button>
        </div>
      </div>
    </nav>
  );
}
