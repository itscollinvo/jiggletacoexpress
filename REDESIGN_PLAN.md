# Redesign plan: Projects, About, Motion

Big refresh of the two most-visited public pages, plus a site-wide subtle-animation pass. Reference vibe: `luke.brevoort.com` — clean, considered, quietly animated, content-first.

Split into **five phases** so nothing merges half-done. Each phase is its own PR, each shippable independently.

---

## Guiding principles

- **Subtle over expressive.** Motion should reward attention, not demand it. Everything respects `prefers-reduced-motion`.
- **Content-first.** Design should make the writing/projects easier to read, not compete with them.
- **Extend, don't replace.** Palette, typography, and rounded-3xl border language stay. We're adding depth, not swapping style.
- **Ship small.** Each phase is one PR, one review pass, one merge.

---

## Phase 1: Motion foundation (R.1)

Install a lightweight motion primitive layer we'll reuse across every phase.

**Install**
- `framer-motion` (aka `motion/react` — same lib, new name in v11+)

Why framer-motion vs pure CSS: page transitions and stagger effects that respond to route changes are painful in raw CSS. The library is ~30KB gzipped and tree-shakes well.

**Build**
- `src/components/motion/FadeIn.tsx` — wrap any block to fade + rise 8px on mount
- `src/components/motion/StaggerList.tsx` — stagger children by 60ms
- `src/components/motion/HoverLift.tsx` — micro-scale + shadow on hover (replaces some `hover:` classes for smoother easing)
- `src/components/motion/PageTransition.tsx` — subtle fade between route changes
- All primitives short-circuit to identity when `useReducedMotion()` returns true

**Wire**
- Apply `PageTransition` in root layout
- Sprinkle `FadeIn` on existing hero sections (home, blog, projects, about)
- No content changes — this phase is invisible if you're not looking

**Ship as:** `v4/r1-motion-foundation`

---

## Phase 2: Projects visual polish + featured hero (R.2)

Make the cards feel like they're worth clicking.

**Schema additions** (Drizzle migration)
- `techStack: text[]` — array of tags like `["Next.js", "Postgres", "Vercel"]`
- `status: varchar(16)` — `"active" | "wip" | "archived"` (default `active`)
- `featured: boolean` — flag for hero treatment (default false)
- `sortOrder: integer` — manual ordering fallback (default 0)
- `demoUrl: varchar(500)` — nullable, for live-demo links

**Component work**
- Rewrite `ProjectCard`: bigger thumbnail (16:9, no crop), gradient overlay on hover, tech-stack chips, status badge (colored dot), demo/github icon row
- New `FeaturedProjectHero.tsx`: full-width card, larger typography, room for a longer description snippet
- `/projects` page: featured project(s) on top, everything-else grid below

**Admin work**
- Extend `/admin/projects` form with new fields (chip input reused from blog for tech stack, status radio, featured toggle, sortOrder number input)

**Ship as:** `v4/r2-projects-polish`

---

## Phase 3: Project detail pages (R.3)

Every project gets its own page. Cards become previews that click through.

**Schema additions**
- `slug: varchar(200) unique` — same kebab-case pattern as blog
- `longMarkdown: text` — full case-study body (markdown, reuses MarkdownRenderer from blog)
- `screenshots: text[]` — array of Blob URLs
- Backfill: generate slugs from existing titles

**Routes**
- New `/projects/[slug]/page.tsx` — case-study layout: hero image, tech stack, long-form markdown, screenshot gallery, links footer
- Cards on `/projects` become internal links to `/projects/<slug>`
- 404 for missing slugs

**Admin**
- Extend admin project editor with markdown body + screenshot upload (reuse image upload endpoint from blog)

**Ship as:** `v4/r3-project-detail-pages`

---

## Phase 4: Projects filter, sort, tag (R.4)

Only meaningful once you have 6+ projects. Ship after R.3 or defer if the list is small.

**Client-side controls** (no schema changes)
- Filter chips: tech (union of all techStack across projects), status
- Sort dropdown: newest / oldest / custom (sortOrder)
- Empty state when filters exclude everything
- URL state (`?tech=nextjs&status=active`) so filter state is shareable + survives back button

**Ship as:** `v4/r4-projects-filter`
**Optional / defer if projects list is short.**

---

## Phase 5: About page redesign (R.5)

This is the biggest content lift and needs the most collaboration.

**Structure (single scrolling page)**

1. **Hero** — big statement, one line about who you are, small "let's talk" links
2. **Personal narrative** — 2–3 paragraphs. Casual, not resume-speak. Climbing, piano, nature, what you're chasing.
3. **Timeline** — visual journey. High school → Stevens → internships → now. Each entry: date, title, one-sentence context. Alternating left/right on desktop, stacked on mobile.
4. **/now section** — snapshot of current life: what you're building, learning, reading, listening to. Uses a `now.md` file or a DB row that you can update quickly.
5. **Values / how I think** — 3–5 short opinions on craft, learning, work. What you optimize for.
6. **Hobbies gallery** — small grid of photos or illustrations (Blob URLs)

**Components to build**
- `TimelineEntry.tsx` — icon + date + title + description, alternating alignment
- `NowSection.tsx` — reads from `content/now.md` at build time or from DB (we'll pick during R.5)
- `ValuesList.tsx` — styled quote-like blocks

**Content collaboration**
- I'll draft placeholder copy in each section from what I know about you (Stevens CS, climbing, piano, this project)
- You edit each section inline; we iterate

**Ship as:** `v4/r5-about-redesign`

---

## Order of operations

The order matters — motion foundation first so everything after gets it for free.

```
R.1 Motion foundation      ← ~1 hr, invisible but enables the rest
R.2 Projects polish + hero ← ~2 hr
R.3 Project detail pages   ← ~2 hr
R.5 About redesign         ← ~2 hr (content-heavy, longest collaboration)
R.4 Projects filter        ← ~1 hr, ship last (or skip if project count is low)
```

I moved R.4 to the end because it's optional and depends on how many projects there are.

---

## Open questions (answer inline as we go)

- **How many projects do you currently have in the DB?** If it's ≤ 4, R.4 (filter) is overkill and we should skip it.
- **Do you have hobby photos to upload for the about page?** If not, we can source stock imagery, use illustrations, or leave placeholders and swap later.
- **`/now` — DB row or markdown file?** Markdown file = edit in your editor, git-commit to update. DB row = edit in `/admin`, no deploy needed. Faster iteration with DB; simpler with markdown.
- **Timeline entries — how far back?** High school + college only, or include middle-school milestones too?
- **Reference from `luke.brevoort.com` — paste the URL in a plain chat message and I'll fetch it** so I can match the animation timing / layout details specifically.

---

## Non-goals

- No custom cursors, parallax, or scroll-jacking (kept in "expressive" bucket, we picked subtle)
- No CMS integration (admin routes already do this)
- No dark/light theme rework (existing theme works)
- No home page redesign (separate scope)
