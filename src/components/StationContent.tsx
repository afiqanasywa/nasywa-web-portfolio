import { useMemo, useRef, useState, type ReactNode } from 'react';
import { synth } from '../audio/retroSynth';
import { asset, portfolioData, type Achievement, type ContactLink, type StationId } from '../data/portfolioData';

interface Props {
  station: StationId;
  photoUrl: string | null;
  onPhotoChange: (url: string | null) => void;
  onCopied: (label: string) => void;
}

/** The photo preview/upload tool only exists in `npm run dev`; production builds drop it entirely. */
const SHOW_PHOTO_TOOL = import.meta.env.DEV;

const { profile, techStack, tools, languages, experience, projects, education, achievements, highlights, contacts } =
  portfolioData;

/* ------------------------------ shared bits ------------------------------ */

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-3 mt-1 font-pixel text-base text-gold sm:text-lg">{children}</h3>;
}

function Chip({ children, tone = 'rose' }: { children: ReactNode; tone?: 'rose' | 'amber' | 'plain' }) {
  const tones = {
    rose: 'bg-rose-soft/15 text-rose-blush border-rose-soft/40',
    amber: 'bg-amber-glow/10 text-amber-glow border-amber-glow/35',
    plain: 'bg-parchment/5 text-parchment/85 border-parchment/20',
  };
  return <span className={`inline-flex items-center rounded-[3px] border px-2 py-0.5 text-[13px] ${tones[tone]}`}>{children}</span>;
}

function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="mb-4 flex gap-2">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          type="button"
          aria-selected={value === t.id}
          onClick={() => {
            synth.click();
            onChange(t.id);
          }}
          className={`pixel-btn rounded-[4px] px-3 py-1.5 text-sm ${
            value === t.id ? 'bg-gold text-ink' : 'bg-[#4a2a1c] text-parchment/80 hover:text-parchment'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

const GitHubIcon = () => (
  <svg viewBox="0 0 16 16" className="h-4 w-4 fill-current" aria-hidden="true">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
);

/* ------------------------------ 1. Nasywa ------------------------------ */

function BioPanel({ photoUrl, onPhotoChange }: Pick<Props, 'photoUrl' | 'onPhotoChange'>) {
  const fileRef = useRef<HTMLInputElement>(null);
  // Detected photo first; if it fails, try the other common extensions, then the pixel placeholder.
  const candidates = useMemo(() => {
    const base = profile.photo.replace(/\.[a-z]+$/i, '');
    const alts = ['jpg', 'jpeg', 'png', 'webp'].map((ext) => `${base}.${ext}`).filter((p) => p !== profile.photo);
    return [profile.photo, ...alts, profile.photoFallback].map(asset);
  }, []);
  const [attempt, setAttempt] = useState(0);
  const [preview, setPreview] = useState<string | null>(SHOW_PHOTO_TOOL ? photoUrl : null);
  const src = preview ?? candidates[Math.min(attempt, candidates.length - 1)];
  const setSrc = (url: string | null) => setPreview(url);
  const [error, setError] = useState<string | null>(null);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file (JPG, PNG or WebP).');
      return;
    }
    setError(null);
    const url = URL.createObjectURL(file);
    onPhotoChange(url);
    setSrc(url);
    synth.copy();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 sm:flex-row">
        <figure className="mx-auto w-40 shrink-0 sm:mx-0">
          <div className="rotate-[-2deg] bg-parchment p-2 pb-7 shadow-[4px_6px_0_rgba(0,0,0,0.35)]">
            <img
              src={src}
              alt={`Portrait of ${profile.fullName}`}
              onError={() => setAttempt((a) => (a < candidates.length - 1 ? a + 1 : a))}
              className="aspect-[4/5] w-full object-cover"
            />
            <figcaption className="mt-1.5 text-center font-pixel text-sm text-ink">{profile.nickname}</figcaption>
          </div>
          {/* Local development only: try out a photo before adding it to public/images/. Never shipped to visitors. */}
          {SHOW_PHOTO_TOOL && (
            <div className="mt-4 rounded-[4px] border border-dashed border-gold-dark/60 p-2">
              <p className="mb-1.5 font-pixel text-[11px] text-gold">Dev only</p>
              <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="pixel-btn w-full rounded-[4px] bg-[#4a2a1c] px-2 py-1.5 text-[13px] text-parchment"
              >
                Preview another photo
              </button>
              {photoUrl && (
                <button
                  type="button"
                  onClick={() => {
                    onPhotoChange(null);
                    setSrc(null);
                  }}
                  className="mt-1.5 w-full text-xs text-parchment/60 underline-offset-2 hover:underline"
                >
                  Reset to default photo
                </button>
              )}
              {error && <p className="mt-2 text-xs text-rose-soft">{error}</p>}
            </div>
          )}
        </figure>

        <div className="min-w-0 max-w-prose">
          <p className="font-pixel text-2xl text-parchment">{profile.fullName}</p>
          <p className="mb-3 text-[15px] text-rose-soft">
            {profile.headline}, based in {profile.location}
          </p>
          <div className="space-y-3 text-[15px] leading-relaxed text-parchment/85">
            {profile.bio.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>
        </div>
      </div>

      <section>
        <SectionTitle>Tech stack</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          {techStack.map((g) => (
            <div key={g.title} className="rounded-[4px] border border-gold-dark/40 bg-black/15 p-3">
              <p className="mb-2 font-pixel text-sm text-amber-glow">{g.title}</p>
              <div className="flex flex-wrap gap-1.5">
                {g.items.map((s) => (
                  <Chip key={s}>{s}</Chip>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-5 sm:grid-cols-2">
        <section>
          <SectionTitle>Tools</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {tools.map((t) => (
              <Chip key={t} tone="amber">
                {t}
              </Chip>
            ))}
          </div>
        </section>
        <section>
          <SectionTitle>Languages</SectionTitle>
          <ul className="space-y-1.5 text-[15px]">
            {languages.map((l) => (
              <li key={l.name}>
                <span className="font-semibold text-parchment">{l.name}</span>
                <span className="text-parchment/70"> — {l.level}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

/* ------------------------------ 2. Desk ------------------------------ */

function WorkPanel() {
  const [tab, setTab] = useState<'work' | 'projects'>('work');
  return (
    <div>
      <Tabs
        tabs={[
          { id: 'work', label: 'Experience' },
          { id: 'projects', label: 'Featured projects' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'work' ? (
        <ol className="relative space-y-5 border-l-2 border-dashed border-gold-dark/60 pl-5">
          {experience.map((job) => (
            <li key={job.company} className="relative">
              <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-[2px] border-2 border-ink bg-rose-soft" aria-hidden="true" />
              <p className="font-pixel text-lg text-parchment">{job.role}</p>
              <p className="text-[15px] text-amber-glow">
                {job.company}
                {job.period && <span className="text-parchment/60"> ({job.period})</span>}
              </p>
              <ul className="mt-2 max-w-prose list-disc space-y-1 pl-4 text-[15px] leading-relaxed text-parchment/85 marker:text-rose-soft">
                {job.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {job.stack.map((s) => (
                  <Chip key={s} tone="plain">
                    {s}
                  </Chip>
                ))}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {projects.map((p) => (
            <article key={p.name} className="flex flex-col rounded-[4px] border-2 border-gold-dark/60 bg-[#1f1219] p-3">
              <p className="font-pixel text-lg leading-tight text-parchment">{p.name}</p>
              <p className="mb-2 text-[13px] text-rose-soft">{p.tagline}</p>
              <p className="mb-3 flex-1 text-sm leading-relaxed text-parchment/80">{p.description}</p>
              <div className="mb-3 flex flex-wrap gap-1">
                {p.tags.map((t) => (
                  <Chip key={t} tone="plain">
                    {t}
                  </Chip>
                ))}
              </div>
              <a
                href={p.repoUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => synth.click()}
                className="pixel-btn inline-flex items-center justify-center gap-2 rounded-[4px] bg-gold px-3 py-1.5 text-sm text-ink"
              >
                <GitHubIcon /> View on GitHub
              </a>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ 3. Bookshelf ------------------------------ */

const KIND_LABEL: Record<Achievement['kind'], string> = {
  award: 'Award',
  certification: 'Certification',
  scholarship: 'Scholarship',
  test: 'Language test',
};

function EducationPanel() {
  const [tab, setTab] = useState<'edu' | 'awards'>('edu');
  return (
    <div>
      <Tabs
        tabs={[
          { id: 'edu', label: 'Education' },
          { id: 'awards', label: 'Awards & certifications' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'edu' ? (
        <div className="space-y-3">
          {education.map((e) => (
            <div key={e.institution} className="flex gap-3 rounded-[4px] border border-gold-dark/40 bg-black/15 p-3">
              <div className="mt-0.5 h-10 w-2 shrink-0 rounded-[2px] bg-gradient-to-b from-rose-soft to-rosegold" aria-hidden="true" />
              <div>
                <p className="font-pixel text-lg text-parchment">{e.institution}</p>
                <p className="text-[15px] text-amber-glow">{e.program}</p>
                {e.detail && <p className="text-sm text-parchment/70">{e.detail}</p>}
                {(e.gpa || e.honors) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {e.gpa && <Chip>GPA {e.gpa}</Chip>}
                    {e.honors && <Chip tone="amber">{e.honors}</Chip>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {achievements.map((a) => (
            <li
              key={a.title}
              className={`rounded-[4px] border p-3 ${
                a.kind === 'award' ? 'border-gold bg-gold/10' : 'border-gold-dark/40 bg-black/15'
              }`}
            >
              <p className="text-[11px] text-rose-soft">{KIND_LABEL[a.kind]}</p>
              <p className="font-semibold leading-snug text-parchment">
                {a.kind === 'award' && <span aria-hidden="true">🏆 </span>}
                {a.title}
              </p>
              <p className="text-sm text-parchment/65">
                {a.issuer}
                {a.year && a.year !== a.issuer.match(/\d{4}/)?.[0] ? `, ${a.year}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------ 4. Polaroids ------------------------------ */

function HighlightsPanel() {
  const tilts = ['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2'];
  return (
    <div>
      <p className="mb-5 max-w-prose text-[15px] text-parchment/80">{highlights.intro}</p>
      <div className="grid gap-6 sm:grid-cols-2">
        {highlights.items.map((h, i) => (
          <article key={h.role + h.organization} className={`bg-parchment p-3 pb-4 text-ink shadow-[4px_6px_0_rgba(0,0,0,0.35)] ${tilts[i % tilts.length]}`}>
            <div className="relative mb-3 flex aspect-[16/9] items-end overflow-hidden bg-gradient-to-br from-[#f7b9c8] via-[#e88aa5] to-[#c9956b] p-2">
              {h.photo && <img src={asset(h.photo)} alt={h.role} className="absolute inset-0 h-full w-full object-cover" />}
              <span className="relative font-pixel text-xl text-white drop-shadow-[2px_2px_0_rgba(59,36,51,0.6)]">{h.polaroidCaption}</span>
            </div>
            <p className="font-pixel text-base leading-tight">{h.role}</p>
            <p className="text-sm font-semibold text-[#9e3d64]">
              {h.organization}
              {h.period && <span className="font-normal text-ink/60"> ({h.period})</span>}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink/80">{h.description}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ 5. Coffee ------------------------------ */

function ContactRow({ c, onCopied }: { c: ContactLink; onCopied: (label: string) => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <li className="flex flex-col gap-2 rounded-[4px] border-2 border-gold-dark/60 bg-[#1f1219] p-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="font-pixel text-sm text-rose-soft">{c.label}</p>
        <p className="truncate text-[15px] text-parchment">{c.value}</p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={async () => {
            if (await copyText(c.copyValue)) {
              synth.copy();
              setCopied(true);
              onCopied(c.label);
              window.setTimeout(() => setCopied(false), 1500);
            }
          }}
          className="pixel-btn flex-1 rounded-[4px] bg-[#4a2a1c] px-3 py-1.5 text-sm text-parchment sm:flex-none"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
        <a
          href={c.href}
          target={c.id === 'email' ? undefined : '_blank'}
          rel="noreferrer"
          onClick={() => synth.click()}
          className="pixel-btn flex-1 rounded-[4px] bg-gold px-3 py-1.5 text-center text-sm text-ink sm:flex-none"
        >
          {c.id === 'email' ? 'Send email' : `Open ${c.label}`}
        </a>
      </div>
    </li>
  );
}

function ContactPanel({ onCopied }: Pick<Props, 'onCopied'>) {
  return (
    <div>
      <p className="mb-4 max-w-prose text-[15px] text-parchment/80">
        Happy to talk about full stack development, data and BI over a (virtual) coffee. Email is the fastest way to reach me.
      </p>
      <ul className="space-y-2.5">
        {contacts.map((c) => (
          <ContactRow key={c.id} c={c} onCopied={onCopied} />
        ))}
      </ul>
    </div>
  );
}

export default function StationContent({ station, photoUrl, onPhotoChange, onCopied }: Props) {
  switch (station) {
    case 'nasywa':
      return <BioPanel photoUrl={photoUrl} onPhotoChange={onPhotoChange} />;
    case 'desk':
      return <WorkPanel />;
    case 'bookshelf':
      return <EducationPanel />;
    case 'polaroids':
      return <HighlightsPanel />;
    case 'coffee':
      return <ContactPanel onCopied={onCopied} />;
  }
}

export { copyText };
