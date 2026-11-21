import { useEffect, useRef, useState, type ReactNode } from 'react';
import { synth } from '../audio/retroSynth';
import { portfolioData } from '../data/portfolioData';
import { copyText } from './StationContent';

interface Props {
  open: boolean;
  onClose: () => void;
  onCopied: (label: string) => void;
}

const d = portfolioData;

function CvHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-2.5 flex items-center gap-2 font-pixel text-[15px] text-[#9e3d64]">
      <span className="h-2 w-2 rounded-[1px] bg-[#e88aa5]" aria-hidden="true" />
      {children}
    </h3>
  );
}

export default function RecruiterCvModal({ open, onClose, onCopied }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [view, setView] = useState<'fast' | 'full'>('fast');

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      // Return focus for keyboard users, but not to invisible room hit-areas.
      if (previous && !previous.closest('[role="application"]')) previous.focus({ preventScroll: true });
    };
  }, [open, onClose]);

  if (!open) return null;
  const email = d.contacts.find((c) => c.id === 'email')!;
  const allSkills = [...d.techStack.flatMap((g) => g.items)];

  return (
    <div
      className="anim-fade fixed inset-0 z-50 flex items-stretch justify-center bg-[#0d0609]/75 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        id="cv-print"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cv-title"
        onClick={(e) => e.stopPropagation()}
        className="anim-pop flex max-h-[100dvh] w-full max-w-4xl flex-col overflow-hidden bg-[#fffaf3] text-[#2b2226] shadow-2xl sm:max-h-[90dvh] sm:rounded-lg"
      >
        {/* Toolbar */}
        <div className="no-print flex flex-wrap items-center gap-2 border-b border-[#ecdccb] bg-[#f8eee2] px-4 py-2.5 pt-[calc(env(safe-area-inset-top)+0.625rem)] sm:pt-2.5">
          <div role="tablist" aria-label="CV length" className="flex rounded-md bg-[#ecdccb] p-0.5">
            {(
              [
                ['fast', 'Fast-view'],
                ['full', 'Full CV'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                type="button"
                aria-selected={view === id}
                onClick={() => {
                  synth.click();
                  setView(id);
                }}
                className={`focus-ring rounded-[5px] px-3 py-1 text-sm font-semibold ${view === id ? 'bg-white text-[#9e3d64] shadow-sm' : 'text-[#6b5a60]'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={async () => {
                if (await copyText(email.copyValue)) {
                  synth.copy();
                  onCopied('Email');
                }
              }}
              className="focus-ring rounded-md border border-[#d9c6b2] px-3 py-1 text-sm font-semibold text-[#4a3a40] hover:bg-white"
            >
              Copy email
            </button>
            <button
              type="button"
              onClick={() => {
                synth.click();
                setView('full');
                window.setTimeout(() => window.print(), 60);
              }}
              className="focus-ring hidden rounded-md border border-[#d9c6b2] px-3 py-1 text-sm font-semibold text-[#4a3a40] hover:bg-white sm:block"
            >
              Print / save PDF
            </button>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close CV"
              className="focus-ring flex h-8 w-8 items-center justify-center rounded-md bg-[#2b2226] text-white"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="scroll-cozy min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-9 sm:py-8">
          {/* Header */}
          <header className="mb-6 border-b-2 border-[#f4a7b9] pb-5">
            <h2 id="cv-title" className="font-pixel text-3xl leading-tight text-[#2b2226] sm:text-4xl">
              {d.profile.fullName}
            </h2>
            <p className="mt-1 text-lg font-semibold text-[#9e3d64]">{d.profile.headline}</p>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-[#5a4a50]">
              <li>{d.profile.location}</li>
              {d.contacts.map((c) => (
                <li key={c.id}>
                  <a href={c.href} target={c.id === 'email' ? undefined : '_blank'} rel="noreferrer" className="underline decoration-[#f4a7b9] decoration-2 underline-offset-2 hover:text-[#9e3d64]">
                    {c.id === 'email' ? c.value : `${c.label}: ${c.value}`}
                  </a>
                </li>
              ))}
            </ul>
          </header>

          {view === 'fast' ? (
            <div className="grid gap-6 sm:grid-cols-[1.4fr_1fr]">
              <div className="space-y-6">
                <section>
                  <CvHeading>At a glance</CvHeading>
                  <ul className="list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed marker:text-[#e88aa5]">
                    {d.profile.atAGlance.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </section>
                <section>
                  <CvHeading>Experience</CvHeading>
                  <ul className="space-y-2.5">
                    {d.experience.map((x) => (
                      <li key={x.company}>
                        <p className="font-semibold">{x.role}</p>
                        <p className="text-sm text-[#6b5a60]">
                          {x.company}
                          {x.period ? ` (${x.period})` : ''}
                        </p>
                        <p className="text-sm">{x.fastView ?? x.highlights[0]}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
              <div className="space-y-6">
                <section>
                  <CvHeading>Skills</CvHeading>
                  <div className="flex flex-wrap gap-1.5">
                    {allSkills.map((s) => (
                      <span key={s} className="rounded bg-[#fde4ea] px-2 py-0.5 text-[13px] text-[#7a2e4d]">
                        {s}
                      </span>
                    ))}
                  </div>
                </section>
                <section>
                  <CvHeading>Tools</CvHeading>
                  <p className="text-sm">{d.tools.join(', ')}</p>
                </section>
                <section>
                  <CvHeading>Languages</CvHeading>
                  <ul className="text-sm">
                    {d.languages.map((l) => (
                      <li key={l.name}>
                        <span className="font-semibold">{l.name}</span> — {l.level}
                      </li>
                    ))}
                  </ul>
                </section>
                <section>
                  <CvHeading>Projects</CvHeading>
                  <ul className="space-y-1 text-sm">
                    {d.projects.map((p) => (
                      <li key={p.name}>
                        <a href={p.repoUrl} target="_blank" rel="noreferrer" className="font-semibold underline decoration-[#f4a7b9] underline-offset-2">
                          {p.name}
                        </a>{' '}
                        <span className="text-[#6b5a60]">— {p.tagline}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
          ) : (
            <div className="space-y-7">
              <section>
                <CvHeading>Profile</CvHeading>
                <div className="max-w-prose space-y-2 text-[15px] leading-relaxed">
                  {d.profile.bio.map((p) => (
                    <p key={p.slice(0, 20)}>{p}</p>
                  ))}
                </div>
              </section>

              <section>
                <CvHeading>Work experience</CvHeading>
                <div className="space-y-4">
                  {d.experience.map((x) => (
                    <div key={x.company} className="break-inside-avoid">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <p className="font-semibold">
                          {x.role}, <span className="text-[#9e3d64]">{x.company}</span>
                        </p>
                        {x.period && <p className="text-sm text-[#6b5a60]">{x.period}</p>}
                      </div>
                      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[15px] leading-relaxed marker:text-[#e88aa5]">
                        {x.highlights.map((h) => (
                          <li key={h}>{h}</li>
                        ))}
                      </ul>
                      <p className="mt-1 text-sm text-[#6b5a60]">Stack: {x.stack.join(', ')}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <CvHeading>Featured projects</CvHeading>
                <div className="space-y-3">
                  {d.projects.map((p) => (
                    <div key={p.name} className="break-inside-avoid">
                      <p className="font-semibold">
                        {p.name} <span className="font-normal text-[#6b5a60]">— {p.tagline}</span>
                      </p>
                      <p className="text-[15px] leading-relaxed">{p.description}</p>
                      <a href={p.repoUrl} target="_blank" rel="noreferrer" className="text-sm text-[#9e3d64] underline underline-offset-2">
                        {p.repoUrl.replace('https://', '')}
                      </a>
                    </div>
                  ))}
                </div>
              </section>

              <div className="grid gap-7 sm:grid-cols-2">
                <section>
                  <CvHeading>Education</CvHeading>
                  <div className="space-y-3">
                    {d.education.map((e) => (
                      <div key={e.institution}>
                        <p className="font-semibold">{e.institution}</p>
                        <p className="text-[15px]">{e.program}</p>
                        {(e.gpa || e.honors) && (
                          <p className="text-sm text-[#6b5a60]">
                            {e.gpa && `GPA ${e.gpa}`}
                            {e.gpa && e.honors && ', '}
                            {e.honors}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
                <section>
                  <CvHeading>Skills & tools</CvHeading>
                  <div className="space-y-1.5 text-[15px]">
                    {d.techStack.map((g) => (
                      <p key={g.title}>
                        <span className="font-semibold">{g.title}:</span> {g.items.join(', ')}
                      </p>
                    ))}
                    <p>
                      <span className="font-semibold">Tools:</span> {d.tools.join(', ')}
                    </p>
                    <p>
                      <span className="font-semibold">Languages:</span> {d.languages.map((l) => `${l.name} (${l.level})`).join('; ')}
                    </p>
                  </div>
                </section>
              </div>

              <section>
                <CvHeading>Certifications & awards</CvHeading>
                <ul className="grid gap-x-6 gap-y-1 text-[15px] sm:grid-cols-2">
                  {d.achievements.map((a) => (
                    <li key={a.title}>
                      <span className="font-semibold">{a.title}</span>
                      <span className="text-[#6b5a60]">
                        {' '}
                        — {a.issuer}
                        {a.year && !a.issuer.includes(a.year) ? `, ${a.year}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <CvHeading>{d.highlights.title}</CvHeading>
                <div className="space-y-2.5">
                  {d.highlights.items.map((h) => (
                    <div key={h.role}>
                      <p className="font-semibold">
                        {h.role}, <span className="text-[#9e3d64]">{h.organization}</span>
                      </p>
                      <p className="text-[15px] leading-relaxed">{h.description}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
