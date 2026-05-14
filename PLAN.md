# Personal Website — Build Plan

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · Vercel · GitHub Actions · Postgres (Vercel/Neon) · Custom auth (bcrypt + TOTP)

**Author:** jiggletaco · **Approach:** MVP first, then iterate

---

## Architecture at a glance

```
GitHub repo (main + feature branches)
        │
        ▼ push
   GitHub Actions (lint, typecheck, test, build)
        │
        ▼ pass
   Vercel (preview URL per PR, auto-promote on main)
        │
        ▼
   Production: jiggletaco.com (or similar)
        │
        ├── /                  → Front page (public, dynamic Spotify)
        ├── /projects          → Showcase grid
        ├── /about             → About me
        ├── /blog              → MDX-driven posts
        ├── /admin             → Login + 2FA gate
        │     └── /admin/*     → Manage projects, integrations toggles
        └── /api/*             → Server routes (auth, spotify, integrations)
```

The admin panel writes to a **Postgres** DB. The public site reads from that DB so you can flip what's visible without a redeploy. Heavy/static content (blog posts) lives in the repo as MDX.

---

## Phase 1 — MVP (target: live in ~1 weekend)

**Goal:** A polished public site you'd be proud to share, deploying automatically.

1. **Repo + tooling**
   - `npx create-next-app@latest` with TypeScript, Tailwind, ESLint, App Router, src dir.
   - Add Prettier, Husky pre-commit hook (lint + typecheck), `.editorconfig`.
   - Push to a new GitHub repo, link to Vercel — push-to-deploy works immediately.

2. **GitHub Actions CI**
   - `.github/workflows/ci.yml`: install, lint, typecheck, `next build`.
   - Block merging to `main` until CI passes (branch protection rule).
   - Vercel handles preview deploys per PR automatically — combined, this gives you the "easy to update + verify it works" guarantee you wanted.

3. **Theme system (light / dark / color)**
   - Use `next-themes` for the toggle, but extend with a third "color" theme.
   - Define three CSS variable sets in `globals.css`; Tailwind reads them via `theme.extend.colors`.
   - Toggle button in the sidebar cycles light → dark → color, persists to `localStorage`.

4. **Layout + navigation**
   - Persistent left sidebar: **Projects · About · Blog**, your name/handle at top, theme toggle at bottom.
   - Mobile: collapsible drawer.

5. **Front page content**
   - Hero: "I am jiggletaco, I like to make life simple & enjoyable :)"
   - "Currently listening to..." block (placeholder card in Phase 1, real Spotify in Phase 2).
   - The CS-student blurb you wrote, formatted cleanly.
   - Casual "about" paragraph (climbing, pianos, nature).
   - LinkedIn + email links for professional inquiries.

6. **Project showcase**
   - Hardcoded array of `{title, image, description, githubUrl}` in `src/data/projects.ts` for now.
   - Grid of cards with hover state, click → external GitHub link.
   - Phase 2 swaps this for DB-driven content.

7. **Deploy + custom domain**
   - Buy domain (Namecheap / Cloudflare Registrar — ~$10/yr).
   - Point DNS to Vercel, enable HTTPS (automatic).

**Phase 1 done = you have a live, themeable, well-structured site.**

---

## Phase 2 — Admin + Integrations

**Goal:** Update content without touching code; light up the API integrations.

1. **Database**
   - Add Vercel Postgres (or Neon) — free tier is plenty.
   - Use Drizzle ORM (lighter than Prisma, great TS inference).
   - Tables: `users`, `projects`, `featured_project`, `integration_tokens`, `sessions`.

2. **Custom auth (password + TOTP 2FA)**
   - Single admin user — seed your hashed password via env var on first boot.
   - **Password:** `bcrypt` (cost factor 12) for hashing.
   - **2FA:** `otplib` for TOTP — generate a secret, show QR via `qrcode`, scan into Authy/Google Authenticator.
   - **Session:** signed JWT in an `httpOnly`, `secure`, `sameSite=strict` cookie. 1-hour expiry, sliding refresh.
   - **Middleware:** `middleware.ts` gates all `/admin/*` and `/api/admin/*` routes.
   - **Rate limit:** Upstash Redis (free tier) — 5 login attempts per IP per 15 min.
   - **Recovery:** generate one-time backup codes at 2FA setup, store hashed.
   - ⚠️ Security checklist before going live: CSRF tokens on mutations, no auth-info in error messages, audit log of admin actions, dependency scan via `npm audit` in CI.

3. **Admin pages**
   - `/admin/login` — password → TOTP step.
   - `/admin/projects` — CRUD for project showcase (replace the hardcoded array). Image upload to Vercel Blob.
   - `/admin/featured` — pick which Claude Project to feature on the front page.
   - `/admin/integrations` — connect/disconnect each integration, see token status.

4. **Spotify "currently listening"**
   - OAuth flow inside admin (one-time auth → store refresh token).
   - Server route `/api/spotify/now-playing` polls Spotify's `/me/player/currently-playing`.
   - Cache for 30s (Vercel KV) so you don't hammer the API.
   - Front page widget polls every 30s client-side.

5. **Claude Projects integration**
   - Use Claude API to list your projects.
   - Admin toggle: "show on front page" per project.
   - Front page renders the active one as a small card under the hero.

---

## Phase 3 — Blog + remaining integrations

1. **Blog** — MDX files in `src/content/blog/`, `contentlayer` or `next-mdx-remote` for rendering. Frontmatter for title/date/tags. RSS feed.
2. **Obsidian vault (IDEAS)** — sync via a small script: read your vault dir, push markdown to a `/ideas` private route. Can run as a GitHub Action on a cron in your dotfiles repo.
3. **Canvas + Workday** *(planning)* — these don't have public APIs. Realistic options: scrape with a personal session token, or skip and just embed iCal feeds for due dates.
4. **Outlook (separate email)** — Microsoft Graph API, OAuth in admin, show unread count / recent senders only (don't expose content publicly).
5. **Slack send** — Slack incoming webhook from admin: type a message, post to a channel. Trivial once admin auth is solid.

---

## Recommended file structure

```
personal-website/
├── .github/workflows/ci.yml
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── page.tsx              # front
│   │   │   ├── projects/page.tsx
│   │   │   ├── about/page.tsx
│   │   │   └── blog/[slug]/page.tsx
│   │   ├── admin/
│   │   │   ├── login/page.tsx
│   │   │   ├── projects/page.tsx
│   │   │   └── layout.tsx            # auth gate
│   │   ├── api/
│   │   │   ├── auth/[...]/route.ts
│   │   │   ├── spotify/now-playing/route.ts
│   │   │   └── admin/[...]/route.ts
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── ThemeToggle.tsx
│   │   ├── NowPlaying.tsx
│   │   └── ProjectCard.tsx
│   ├── lib/
│   │   ├── db/                       # drizzle schema + client
│   │   ├── auth/                     # bcrypt, totp, session helpers
│   │   └── spotify.ts
│   ├── data/projects.ts              # phase 1 only
│   └── middleware.ts                 # admin gate
├── tailwind.config.ts
├── drizzle.config.ts
└── next.config.mjs
```

---

## Cost estimate

| Item | Cost |
|---|---|
| Domain | ~$10/yr |
| Vercel Hobby | Free |
| Vercel Postgres / Neon | Free tier fine |
| Vercel Blob (images) | Free up to 1GB |
| Upstash Redis (rate limit) | Free tier fine |
| Spotify / Claude / Slack APIs | Free for personal scale |
| **Total** | **~$10/yr** |

---

## Suggested next step

Start Phase 1, step 1 right now: I can scaffold the Next.js app, set up the theme system, build the front page from your copy, and wire up GitHub Actions CI — all in this folder. Say the word and I'll begin.
