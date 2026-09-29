# Blog — Build Plan

**Goal:** ship a blog at `/blog` where each post is a change-log entry for the site, PRD-flavored — "here's what shipped, why, and what it moved." First post is a walkthrough of `/vault`.

**Approach:** DB-backed posts editable from `/admin/blog`, no redeploy per post. Markdown body with syntax highlighting, images, GitHub PR embeds, GFM extras. Suggested template in the editor, but the body is freeform.

---

## Design decisions (locked)

| Decision | Choice |
|---|---|
| Storage | Postgres `blog_posts` table (matches `projects` pattern) |
| Body format | Markdown text, rendered client- and server-side |
| Structure | Metadata fields (title, subtitle, PR link, etc.) + freeform markdown body. Suggested template pasted into the editor when creating |
| Editor | Textarea + live preview in admin (Phase 1); optional rich editor later |
| Publishing | `status: draft | published` + `publishedAt`. Save-as-draft doesn't affect public site |
| URL | `/blog/[slug]` — slug auto-generated from title, editable |
| Media | Inline images via Vercel Blob (same helper as project image upload) |
| Rendering | `react-markdown` + `remark-gfm` + `rehype-shiki` for syntax highlighting |
| PR embeds | Custom remark plugin that detects `github.com/*/pull/N` links and renders a card with title / status. Fetched at build/render time, cached |
| Feed | RSS at `/feed.xml` (Phase 2) |
| Auth | Read: public. Write: admin-only (existing `requireCurrentUser`) |

---

## Data model — `blog_posts` table

```ts
export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),

  // URL + identity
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  subtitle: varchar("subtitle", { length: 500 }),

  // Body
  bodyMarkdown: text("body_markdown").notNull(),

  // PRD-flavored metadata (all optional — the "suggested" part)
  coverImageUrl: varchar("cover_image_url", { length: 500 }),
  // Comma-separated PR/commit URLs the post is about. Rendered as cards
  // above the body. Stored as text[] in Postgres.
  changeLinks: text("change_links").array().notNull().default(sql`ARRAY[]::text[]`),
  // Free-form tags — used for filtering on the index page later.
  tags: text("tags").array().notNull().default(sql`ARRAY[]::text[]`),

  // Publishing state
  status: varchar("status", { length: 16 }).notNull().default("draft"),
  publishedAt: timestamp("published_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

Notes on the shape:
- `changeLinks` and `tags` as Postgres `text[]` — Drizzle supports this natively. Small counts (usually 1–3), no need for a separate join table.
- `status` as varchar rather than enum for easy migration later ("scheduled" state, etc.).
- `publishedAt` separate from `updatedAt` — lets us reorder posts by publish date without touching edit timestamps.

---

## Renderer

Server-side render the markdown → HTML on request, cache the HTML string on the row (`bodyHtml` column) or just re-render every request (Phase 1 keeps it simple).

**Library stack:**
- `react-markdown` — renders markdown to React elements
- `remark-gfm` — GitHub Flavored Markdown (tables, task lists, strikethrough, autolinks)
- `remark-directive` + `remark-directive-rehype` — enables `:::note`, `:::warning`, etc. callouts
- `rehype-shiki` — code block syntax highlighting using VS Code themes
- Custom plugin: **PR embed** — walk the AST for `github.com/*/pull/N` links, replace with a `<PrCard>` React component. The card fetches title/state via a server helper that hits GitHub's REST API (unauthenticated, 60 req/hr limit is plenty; cache in Upstash for 24hr).

**Suggested body template** (auto-inserted when creating a new post):

```markdown
## The problem

Why this change existed. What was broken, missing, or worse than it could be.

## The approach

What we built and the tradeoffs behind it. Link decisions to constraints.

## What shipped

Concrete list — routes added, tables changed, UI moved. Link screenshots and PRs above.

## What's next

Followups, known limitations, related work queued.
```

The user can delete/reorder these sections freely — they're just a starting point.

---

## Admin UI — `/admin/blog/*`

Mirrors the `/admin/projects` shape you already built:

**`/admin/blog`** — list view:
- Table: title, status badge (Draft/Published), published date, actions (Edit, Delete, Toggle publish)
- "New post" button top-right
- Filter chip: All / Drafts / Published

**`/admin/blog/new`** — create form:
- Fields: title, subtitle, slug (auto-generated from title, editable), cover image (upload → Blob), change links (repeatable input), tags (comma-separated), body (textarea with template pre-filled)
- Live preview pane on the right (client-side markdown render)
- Save as Draft button + Publish button

**`/admin/blog/[id]/edit`** — same form as `/new`, pre-populated
- Extra: "Unpublish" button when currently published

**Server Actions** (`src/app/admin/blog/actions.ts`):
- `createPostAction` — validate with Zod, insert, redirect to edit view (so you can iterate)
- `updatePostAction` — validate, update, `revalidatePath("/blog", "/blog/[slug]")`
- `togglePublishAction` — flip status, set `publishedAt` on first publish
- `deletePostAction` — with confirmation (reuse `DeleteButton` pattern from projects)

**Validation** (`src/lib/validation/blog.ts`):
- Slug: kebab-case, unique, max 200
- Title required, non-empty after trim
- If publishing: body must have >100 chars (soft guard against publishing empty)
- All URLs in changeLinks must be valid + optionally GitHub

---

## Public UI

**`/blog`** — index:
- Grid or list of published posts, newest first
- Each card: cover image (or accent color block), title, subtitle, published date, first tag
- Filter by tag via `?tag=X` query param
- Pagination or infinite scroll (keep simple — just show latest 20, paginate later)

**`/blog/[slug]`** — single post:
- Hero: cover image, title, subtitle, published date, tag chips
- Change links row: horizontal list of PR cards above body
- Rendered body with proper typography (Tailwind `prose` class works well here)
- "Back to blog" and "Written by Collin" footer
- Optional: previous/next post links

**`/feed.xml`** — RSS feed (Phase 2):
- Standard RSS 2.0
- Include published posts only, newest 20
- Static route with `revalidate = 300` (5 min cache)

**Metadata** — each post's page exports `generateMetadata` for OG image + description → so blog links unfurl nicely on Twitter/LinkedIn/Slack.

---

## The launch post — `/vault` walkthrough

**Slug:** `building-the-vault`
**Title:** Building the vault: a locked terminal for the parts of me I don't share
**Subtitle:** How the vault gate, terminal UI, and DB-backed notes / journal / photos came together
**Change links:**
- `feat/vault-gate` PR
- `feat/vault-notes-journal-db` PR
- Whatever other vault PRs shipped
**Tags:** `vault`, `auth`, `ui`, `postgres`
**Cover image:** screenshot of the terminal at the unlock prompt

### Draft outline

**## The problem**

I wanted a section of the site that felt like *my* space — not "public portfolio" and not "admin panel." Somewhere for notes I'm still working out, journal entries, photos that are just for me and a few people. The public site is the polished front; the admin is the levers behind the scenes; the vault is the private room.

Constraints:
- Access-code-gated, not password-based (I don't want it in my main auth flow)
- Separate session from the admin cookie — so being logged into admin doesn't give you the vault, and vice versa
- Feels distinct visually — a terminal UI to sell the "you're in the back room now" vibe
- Notes, journal, photos as first-class content types, not one homogeneous list

**## The approach**

Three moving parts:

1. **The gate** — `/vault` is a public page rendering a fake terminal. You type an access code (rate-limited via the shared Upstash pattern). The `/api/vault/unlock` route validates the code against `VAULT_ACCESS_CODE` env var, signs a short-lived JWT (`vault-session.ts`), sets it as an httpOnly cookie under a name that doesn't collide with the admin session. The vault proxy check (in `proxy.ts`) reads that cookie and either lets you into `/vault/home` or bounces you back to `/vault`.

2. **The terminal** — `src/components/vault/Terminal.tsx` — a ~400 line React component that renders a monospace prompt, handles command input, has a filesystem-flavored autocomplete (`ls`, `cd`, `open notes/`, etc.) backed by `src/lib/vault/filesystem.ts`. It's a UI over the actual routes — `cd notes` navigates to `/vault/home/notes`. Purely aesthetic, but sets the tone.

3. **The content** — three tables + admin CRUD:
   - `vault_notes` — short-form ideas, freeform markdown
   - `vault_journal` — timestamped entries, markdown body
   - `vault_photos` — image URLs (Blob-uploaded) + captions
   - Each surfaces on its own `/vault/home/*` route
   - Admin management at `/admin/vault/*` — forms for creating notes, journal entries, uploading photos

**## What shipped**

- Two migrations: `0003_flashy_deathstrike.sql` and `0004_legal_glorian.sql` — schema for the three content tables plus the vault-session infrastructure
- `proxy.ts` extended with vault-cookie handling alongside admin-cookie handling
- `src/app/vault/*` — public routes with the terminal + gated inner pages
- `src/app/admin/vault/*` — full CRUD for notes, journal, photos
- `src/lib/auth/vault-session.ts` — JWT sign/verify separate from `session.ts`
- `src/lib/vault/filesystem.ts` — the fake filesystem the terminal walks

**## What's next**

- Photo albums (currently a flat list)
- Search across notes and journal
- Optional: cross-links between entries — "this note references this journal entry from Sept 12"
- Optional: end-to-end encryption on note bodies — if someone got DB access, they'd still see plaintext today

---

## Chunked build plan

Same pattern as the rest of Phase 2 — small PRs, each ends in a working state.

### Phase B.1 — Schema + minimal admin

- Add `blog_posts` table to `src/lib/db/schema.ts`
- Generate + apply migration (`0005_*.sql`)
- Add queries in `src/lib/db/queries/blog.ts`: `getAllPosts`, `getPublishedPosts`, `getPostBySlug`, `getPostById`, `createPost`, `updatePost`, `deletePost`, `togglePublish`
- Add Zod schema in `src/lib/validation/blog.ts`
- Add `/admin/blog` list page (reuse the projects table pattern)
- Add `/admin/blog/new` and `/admin/blog/[id]/edit` — barebones form: title, subtitle, slug, body textarea (no live preview yet), save-as-draft only
- Server actions in `src/app/admin/blog/actions.ts`
- Add "Blog" card to `/admin` dashboard

**End state:** You can create and edit blog posts from admin, but they're not visible publicly yet.

### Phase B.2 — Public read + markdown rendering

- Install `react-markdown`, `remark-gfm`, `rehype-shiki`, `remark-directive`, `remark-directive-rehype`
- Build `src/components/blog/PostBody.tsx` — takes markdown, renders with the stack above, applies `prose` styling
- Build `/blog` index page — lists published posts
- Build `/blog/[slug]` page — renders single post
- Add `generateMetadata` for OG tags
- Update the sidebar nav — blog link is already there, but confirm it lands on `/blog`

**End state:** You can publish a post and read it at `/blog/[slug]`. Basic markdown works (headings, links, lists, code blocks with highlighting, tables via GFM).

### Phase B.3 — Richer editor + inline media

- Add live preview pane to the admin editor (client component, `react-markdown` again)
- Wire up image upload in the editor — button that pops a file picker, uploads to Blob, inserts markdown `![](url)` at cursor
- Add cover image upload
- Add tag input (comma-separated → array)
- Add change links input (repeatable text field → array)
- Auto-generate slug from title on create; make editable

**End state:** Full-featured post editor. Everything from the design is in place except PR embeds and RSS.

### Phase B.4 — PR embeds + polish

- Build custom remark plugin: `remark-pr-embeds.ts` — matches `github.com/{owner}/{repo}/pull/{n}`, replaces with `<PrCard>` component
- `PrCard.tsx` — fetches PR metadata from GitHub REST API (cached in Upstash for 24h), renders title, status, author avatar
- Render change links row above the body on `/blog/[slug]`
- Publish/unpublish toggle in admin list view (no need to open edit)
- Draft badge visible in admin, hidden from public

**End state:** Posts feel like proper change-log entries. Ready to write the vault post.

### Phase B.5 — Write and publish the vault launch post

- Grab screenshots: terminal at unlock prompt, unlocked home page, notes list, journal, photos grid, admin vault edit forms
- Write the post following the outline above
- Publish
- Share the URL

### Phase B.6 (stretch) — RSS feed

- `/feed.xml` route serves RSS 2.0
- `revalidate = 300`
- Add a `<link rel="alternate">` tag in root layout for feed discoverability

---

## File layout

```
src/
  app/
    blog/
      page.tsx                   # public index
      [slug]/page.tsx            # public single post
    admin/
      blog/
        page.tsx                 # admin list
        new/page.tsx             # create form
        [id]/edit/page.tsx       # edit form
        actions.ts               # server actions
        post-form.tsx            # shared client form (with live preview)
        delete-button.tsx        # confirm-delete
    feed.xml/route.ts            # RSS
  components/
    blog/
      PostBody.tsx               # markdown → HTML renderer
      PostCard.tsx               # index card
      PrCard.tsx                 # PR embed
      LivePreview.tsx            # admin editor preview
  lib/
    db/
      queries/blog.ts
    validation/blog.ts
    blog/
      markdown.ts                # remark/rehype pipeline
      pr-embeds.ts               # custom remark plugin
      github.ts                  # GitHub API helper (cached)
drizzle/
  0005_*_blog_posts.sql
```

---

## Followups not in scope

- Comments — hard skip. If someone wants to say something, they can email
- Reactions / view counter — cheap but pointless for a personal site
- Newsletter — maybe later if RSS isn't enough
- Search — defer until there are more than ~10 posts
- Scheduled publishing — defer; save-as-draft is enough for now
- Multi-author — you're the only author

---

## Cost impact

Zero. Everything runs on the free tiers you're already paying nothing for. Blob storage may grow if you paste lots of images — the 1GB free tier holds thousands of screenshots.
