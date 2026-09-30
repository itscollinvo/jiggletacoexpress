# Vault project entry — copy into /admin/projects/new

Not a blog post — this is the content for the vault as its own project card.

---

**Title:** `The Vault`

**Slug:** `the-vault` (auto-fills)

**Description (short — shown on the card):**
```
A gated, terminal-based private filesystem inside my personal site. Nested folders, hidden items in red for guests, admin login and write commands right in the terminal.
```

**Long-form body (case study page — markdown):**

```markdown
## The problem

I wanted somewhere on my public site that wasn't public. Not photos on Instagram, not notes in Notion, not journal entries in Apple's Notes app — my own space, on my own domain, that I control. And I wanted the way I interact with it to feel like the tool it is, not like another CRUD form.

## The approach

**A terminal, not a form.** The whole vault is a text-based interface. `ls`, `cd`, `cat`, `mkdir`, `touch`, `rm` — every operation is a command. Guests browse read-only; admin runs write commands after typing `admin login` (email → password → 2FA, all inside the terminal).

**A real filesystem, not three sections.** Folders can nest arbitrarily. Files (notes, photos, journal entries) live directly in whatever folder they belong to. `~/climbing/2025-summer/beta.md` is a legal path.

**Hidden items in red.** Any folder or file can be flipped private with an `is_public` flag. Guests still see the name on `ls` — rendered in red — but `cd` and `cat` refuse. Admin sees everything normally.

**Two auth boundaries.** A shareable access code gates `/vault` itself (so the URL isn't a giveaway to strangers). Admin credentials gate write commands. Losing the code doesn't give someone edit access; losing the credentials doesn't leak the URL.

## What shipped

- Postgres schema with a nested folder tree (`parent_id` self-FK, composite unique on `(parent_id, slug)`)
- Client-side terminal component with a command grammar, history, and multi-step auth state machine
- Server actions for every write, each guarded by `requireCurrentUser()` — defense in depth
- Legacy `/general` folder preserves the pre-refactor content behind the old notes/photos/journal sub-dirs
- Prompt flips from `guest@vault:~$` to `Jyrinx@vault:~$` on login
- Admin bypasses the code gate when the session cookie is present

## Tech

Next.js 16 App Router, React 19, TypeScript, Postgres (Neon), Drizzle ORM, Vercel Blob for photos, jose for JWT sessions, otplib for TOTP, bcrypt for password hashing, Upstash for rate limiting.

## Try it

The vault lives at `/vault`. The gate is real — you'll need the code, which I share with people I trust. The terminal is the same interface whether you have the code or not; the difference is what you can see.
```

**Cover image:** upload a screenshot of the terminal (with some folders visible + a hidden one in red for the money shot). Save the screenshot from `/vault/home` while signed in.

**Tags:** `nextjs, postgres, terminal, auth, personal`

**GitHub URL:** `https://github.com/itscollinvo/jiggletacoexpress`

**Demo URL:** `https://jiggletacoexpress.vercel.app/vault`

**Status:** `active`

**Featured:** yes — this is a flagship

**Display order:** `0` (put it at the top of featured, or whatever number wins over your current featured)
