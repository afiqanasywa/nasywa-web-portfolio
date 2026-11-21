/**
 * Single source of truth for every piece of portfolio content.
 * Edit this file to update the cabin dialogs AND the Recruiter CV at the same time.
 */

export type StationId = 'nasywa' | 'desk' | 'bookshelf' | 'polaroids' | 'coffee';

export interface Profile {
  fullName: string;
  nickname: string;
  headline: string;
  location: string;
  /**
   * Path relative to /public. Resolved at build/dev start from
   * public/images/nasywa-profile.(jpg|jpeg|png|webp|avif) — see vite.config.ts.
   */
  photo: string;
  /** Shown if the photo file is missing or fails to load. */
  photoFallback: string;
  /** Short highlights for the top of the Recruiter Fast-View. */
  atAGlance: string[];
  greeting: string;
  bio: string[];
}

export interface SkillGroup {
  title: string;
  items: string[];
}

export interface LanguageSkill {
  name: string;
  level: string;
}

export interface Experience {
  company: string;
  shortName?: string;
  role: string;
  /** Optional — add e.g. "Feb 2025 – Jul 2025" and it appears everywhere automatically. */
  period?: string;
  location?: string;
  stack: string[];
  /** Full CV / cabin dialog bullets. */
  highlights: string[];
  /** One-line summary for the Recruiter Fast-View. Falls back to the first highlight. */
  fastView?: string;
}

export interface Project {
  name: string;
  tagline: string;
  description: string;
  tags: string[];
  repoUrl: string;
  liveUrl?: string;
}

export interface Education {
  institution: string;
  program: string;
  detail?: string;
  period?: string;
  gpa?: string;
  honors?: string;
}

export interface Achievement {
  title: string;
  issuer: string;
  year?: string;
  kind: 'award' | 'certification' | 'scholarship' | 'test';
}

export interface Highlight {
  role: string;
  organization: string;
  period?: string;
  description: string;
  /** Text written on the polaroid in the room. Keep it short. */
  polaroidCaption: string;
  /** Optional photo in /public, e.g. "images/bayanaka.jpg". Without it a soft gradient is shown. */
  photo?: string;
}

export interface HighlightsSection {
  /** Rename freely — this title is used on the dock, in the dialog and in the CV. */
  title: string;
  intro: string;
  items: Highlight[];
}

export interface ContactLink {
  id: 'email' | 'github' | 'linkedin';
  label: string;
  value: string;
  href: string;
  copyValue: string;
}

export interface CatInfo {
  id: 'kishi' | 'nining' | 'miu';
  name: string;
  description: string;
  /** Short cozy lines shown in a bubble when the cat is patted (they rotate). */
  lines: string[];
}

export interface StationMeta {
  id: StationId;
  number: number;
  label: string;
  dockLabel: string;
  /** Very short label for the mobile dock (max ~7 characters). */
  shortLabel: string;
  dialogTitle: string;
  /** Nasywa's line when the dialog opens (typed out RPG-style). */
  speech: string;
}

export interface PortfolioData {
  profile: Profile;
  techStack: SkillGroup[];
  tools: string[];
  languages: LanguageSkill[];
  experience: Experience[];
  projects: Project[];
  education: Education[];
  achievements: Achievement[];
  highlights: HighlightsSection;
  contacts: ContactLink[];
  stations: StationMeta[];
  cats: CatInfo[];
}

const GITHUB = 'https://github.com/afiqanasywa';
/** Exact file found in public/images/ by vite.config.ts (e.g. "images/nasywa-profile.jpg"). */
const PROFILE_PHOTO = __NASYWA_PHOTO__ || 'images/nasywa-profile.jpg';
const EMAIL = 'afiqafadya07@gmail.com';
// Replace with your exact profile URL, e.g. https://www.linkedin.com/in/your-handle
const LINKEDIN =
  'https://www.linkedin.com/search/results/people/?keywords=Afiqa%20Fadhya%20Nasywa';

export const portfolioData: PortfolioData = {
  profile: {
    fullName: 'Afiqa Fadhya Nasywa',
    nickname: 'Nasywa',
    headline: 'Full Stack Developer & Data Enthusiast',
    location: 'Riau, Indonesia',
    photo: PROFILE_PHOTO,
    photoFallback: 'images/profile-placeholder.png',
    atAGlance: [
      'B.Sc. Computer Science, Universitas Riau — GPA 3.90, Cum Laude',
      'SawitPro full stack intern: 15+ Go REST endpoints and 49 merged PRs',
      'Machine learning thesis: clustering Liberica coffee varieties',
      'Best Presenter at ICST 2025 · BNSP certified in Public Relations and Digital Marketing · Certified Novice Public Speaker (2026)',
    ],
    greeting: "Hi, I'm Nasywa! Welcome to my little cabin.",
    bio: [
      'I am a Computer Science graduate from Universitas Riau (GPA 3.90, Cum Laude) who enjoys building things end to end: clean React interfaces on the front, dependable Golang and PostgreSQL services behind them.',
      'Alongside engineering, I love working with data — cleaning messy datasets, finding patterns, and turning them into visuals people actually read. My thesis applied machine learning to cluster Liberica coffee varieties.',
      'I have also worked on the marketing and storytelling side of products, so I care about how software is understood, not only how it runs.',
    ],
  },

  techStack: [
    { title: 'Frontend', items: ['React', 'TypeScript', 'JavaScript', 'Tailwind CSS'] },
    { title: 'Backend', items: ['Golang', 'RESTful APIs', 'PostgreSQL', 'SQL'] },
    { title: 'Data & Automation', items: ['Python', 'Data Cleaning', 'Data Visualization', 'Machine Learning', 'Automation'] },
  ],

  tools: ['VS Code', 'Cursor', 'Figma', 'Android Studio', 'Notion'],

  languages: [
    { name: 'Indonesian', level: 'Native' },
    { name: 'English', level: 'Professional — Duolingo English Test 120/160' },
  ],

  experience: [
    {
      company: 'PT Digital Sawit Pro',
      shortName: 'Digital Sawit Pro',
      role: 'Full Stack / Backend Developer Intern',
      stack: ['Golang', 'PostgreSQL', 'React', 'TypeScript', 'RESTful API', 'OpenAPI'],
      fastView:
        "Built RamPRO's ramp registration backend, 15+ Go REST endpoints and full-stack SawitPro Admin Web features in React/TypeScript, across 49 merged PRs.",
      highlights: [
        "Built RamPRO's ramp registration backend in Go and PostgreSQL, covering endpoints, weighbridge support and database migrations.",
        'Delivered full-stack SawitPro Admin Web features end to end, from OpenAPI contracts to Go services to React/TypeScript UI, across 49 merged PRs.',
        'Built 15+ REST endpoints and moved legacy Express services to Go, including an OCR API for Odoo ERP, retiring 14 old modules.',
      ],
    },
    {
      company: 'PT Ruang Kreasi Berdaya (KUMPUL)',
      shortName: 'KUMPUL',
      role: 'Platform Marketing Intern',
      stack: ['SEO', 'Figma', 'Notion', 'Content Design'],
      highlights: [
        'Improved website SEO scores up to 82/100, reaching a peak of 90/100.',
        'Produced 100+ design assets for the platform and its campaigns.',
        'Organized team knowledge and processes into structured Notion documentation.',
      ],
    },
    {
      company: 'Diskominfotik Riau',
      shortName: 'Diskominfotik Riau',
      role: 'Data & Information Management Intern',
      location: 'Pekanbaru, Riau',
      stack: ['Data Management', 'Data Cleaning', 'Reporting'],
      highlights: [
        'Supported data and information management for the provincial communication, informatics and statistics office.',
        'Helped clean, organize and maintain public-sector datasets for internal reporting.',
      ],
    },
  ],

  projects: [
    {
      name: 'Nasywa’s Cozy Cabin',
      tagline: '2.5D interactive portfolio · this site',
      description:
        'A Stardew-style pixel cabin you can walk around: click-to-walk with A* pathfinding, Y-sorted depth, toggleable lamps, three pettable cats, a lofi soundtrack and 8-bit effects synthesized live with the Web Audio API, plus a recruiter fast-view and printable full CV.',
      tags: ['Vite', 'React', 'TypeScript', 'Tailwind CSS', 'Web Audio API'],
      repoUrl: GITHUB,
    },
    {
      name: 'LAHHGO',
      tagline: 'Plastic waste processing startup',
      description:
        'A startup project developed during the Universitas Gadjah Mada exchange, exploring a business model that turns plastic waste into value through community-based processing.',
      tags: ['Startup', 'Sustainability', 'Product Design'],
      repoUrl: GITHUB,
    },
    {
      name: 'Segitiga Bermuda',
      tagline: 'Android application',
      description:
        'A native Android app built in Android Studio, focused on a simple, friendly mobile experience from layout to navigation.',
      tags: ['Android', 'Android Studio', 'Mobile UI'],
      repoUrl: GITHUB,
    },
    {
      name: 'Liberica Coffee Clustering',
      tagline: 'Undergraduate thesis · Machine Learning',
      description:
        'Applied unsupervised machine learning to cluster Liberica coffee varieties by their characteristics, including data cleaning, feature preparation and cluster evaluation.',
      tags: ['Python', 'Machine Learning', 'Clustering', 'Data Visualization'],
      repoUrl: GITHUB,
    },
  ],

  education: [
    {
      institution: 'Universitas Riau',
      program: 'B.Sc. in Computer Science',
      gpa: '3.90 / 4.00',
      honors: 'Cum Laude',
    },
    {
      institution: 'Universitas Gadjah Mada (FMIPA)',
      program: 'Pertukaran Mahasiswa Merdeka (PMM 4)',
      detail: 'National student exchange program',
      gpa: '3.66 / 4.00',
    },
    {
      institution: 'Pacmann Academy',
      program: 'Business Intelligence & Data Analyst Program',
    },
  ],

  achievements: [
    { title: 'Best Presenter', issuer: 'ICST 2025', year: '2025', kind: 'award' },
    { title: 'Certified Public Relations Staff', issuer: 'BNSP', year: '2025', kind: 'certification' },
    { title: 'Certified Digital Marketing', issuer: 'BNSP', year: '2024', kind: 'certification' },
    { title: 'Riau Cerdas Scholarship', issuer: 'Riau Provincial Government', year: '2022–2025', kind: 'scholarship' },
    { title: 'Duolingo English Test — 120/160', issuer: 'Duolingo', kind: 'test' },
    { title: 'Oracle Cloud Infrastructure Foundations', issuer: 'Oracle', year: '2023', kind: 'certification' },
    { title: 'Database Design & Programming with SQL', issuer: 'Oracle Academy', year: '2022', kind: 'certification' },
    { title: 'Certified Novice Public Speaker', issuer: 'Public speaking certification', year: '2026', kind: 'certification' },
  ],

  highlights: {
    title: 'Community & Creative Highlights',
    intro: 'Little snapshots from the communities that shaped how I lead, design and work with people.',
    items: [
      {
        role: 'Head of Documentation & Design Division',
        organization: 'PMM 4 Inbound UGM — Group Bayanaka',
        description:
          'Led a 3-person team covering documentation and visual design for the group’s activities, from planning shot lists to delivering the final design assets.',
        polaroidCaption: 'Bayanaka',
      },
      {
        role: 'Activity Facilitator',
        organization: 'Chi Alpha Yogyakarta',
        description:
          'Facilitated community activities and helped sessions run smoothly, making sure participants felt welcome and involved.',
        polaroidCaption: 'Chi Alpha',
      },
    ],
  },

  contacts: [
    { id: 'email', label: 'Email', value: EMAIL, href: `mailto:${EMAIL}`, copyValue: EMAIL },
    { id: 'github', label: 'GitHub', value: 'github.com/afiqanasywa', href: GITHUB, copyValue: GITHUB },
    { id: 'linkedin', label: 'LinkedIn', value: 'Afiqa Fadhya Nasywa', href: LINKEDIN, copyValue: LINKEDIN },
  ],

  cats: [
    {
      id: 'kishi',
      name: 'Kishi',
      description: 'orange-and-white tabby asleep on top of the cat tree',
      lines: [
        'Mrrp… five more minutes of sunbeam dreams.',
        'Kishi stretches one paw, then curls up even tighter.',
        'Guarding the highest spot in the cabin. Very important job.',
      ],
    },
    {
      id: 'nining',
      name: 'Nining',
      description: 'ginger tabby with a red collar, napping in the cat tree cubby',
      lines: [
        'Nining peeks out of the cubby… and decides it’s still nap time.',
        'Purr-fectly cozy in here, thank you.',
        'A slow blink. That means “I love you” in cat.',
      ],
    },
    {
      id: 'miu',
      name: 'Miu',
      description: 'tortoiseshell tabby with a turquoise bell collar, asleep on the desk',
      lines: [
        'Miu is reviewing your code. Verdict: needs more naps.',
        '*soft jingle* The keyboard is warm, so this is Miu’s desk now.',
        'Miu dreams of chasing the mouse… the computer one.',
      ],
    },
  ],

  stations: [
    {
      id: 'nasywa',
      number: 1,
      label: '1. NASYWA',
      dockLabel: 'Nasywa',
      shortLabel: 'Bio',
      dialogTitle: 'About Nasywa',
      speech: "Hi, I'm Nasywa! Here's a little about me and the tools I love.",
    },
    {
      id: 'desk',
      number: 2,
      label: '2. CODING DESK',
      dockLabel: 'Work',
      shortLabel: 'Work',
      dialogTitle: 'Work Experience & Projects',
      speech: 'This is where the magic (and the debugging) happens. Miu supervises.',
    },
    {
      id: 'bookshelf',
      number: 3,
      label: '3. BOOKSHELF',
      dockLabel: 'Education',
      shortLabel: 'Study',
      dialogTitle: 'Education & Awards',
      speech: 'Every book here is a chapter I studied hard for. The trophy is my favorite!',
    },
    {
      id: 'polaroids',
      number: 4,
      label: '4. POLAROIDS',
      dockLabel: 'Highlights',
      shortLabel: 'Moments',
      dialogTitle: 'Community & Creative Highlights',
      speech: 'These photos hold some of my favorite memories with amazing people.',
    },
    {
      id: 'coffee',
      number: 5,
      label: '5. COFFEE BAR',
      dockLabel: 'Contact',
      shortLabel: 'Contact',
      dialogTitle: 'Contact Hub',
      speech: "Fancy a coffee chat? Here's how to reach me.",
    },
  ],
};

export const stationById = (id: StationId): StationMeta =>
  portfolioData.stations.find((s) => s.id === id)!;

/** Resolve a /public asset path so it works on Vercel ("/") and GitHub Pages ("/repo/"). */
export const asset = (path: string): string => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
