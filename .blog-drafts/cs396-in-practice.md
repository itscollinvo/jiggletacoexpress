## The problem

I'm taking [CS396](https://cs396-stevens.github.io/) — Stevens' foundations-of-cybersecurity course — while shipping this site. That's a weird overlap. Most of my classes teach me things I'll apply later; CS396 is teaching me things I'm applying right now, in the code I'm pushing that same week. It felt worth writing down where the lecture material actually lives in this codebase, both to lock it in for myself and to be honest about the parts I'm still figuring out.

None of what follows is groundbreaking. It's the standard stuff every intro-security class teaches. The point is that "standard stuff" only clicks when you build the thing yourself and watch someone (or your own future self, or a scraper, or a botnet running dictionary attacks against `/api/auth/login`) test it in the wild.

## The approach

Four ideas from the first six weeks of the course, each with the piece of the site it maps to.

### CIA — confidentiality, integrity, availability

The vault is the clearest CIA case study on the site because all three matter differently.

**Confidentiality.** The vault isn't just "private data" — it's "private data that the URL shouldn't leak." Every folder and every note/photo/journal entry has an `is_public` flag, defaulting to `true` for existing content but explicitly settable to `false`. Guests visiting a hidden folder get `permission denied`, not `404`, because the fact that a folder exists is not itself confidential — the *contents* are. Compare to `cat` on a hidden file, which does the same thing. Different concept than absence.

**Integrity.** Every session cookie is a JWT signed with `AUTH_SECRET`. The client can read the payload if they want — that's fine — but they can't forge one without the secret. When the terminal sees a session cookie on mount, it doesn't trust it to say "you're admin"; the server actions call `requireCurrentUser()` on every mutation, which re-verifies the signature. Client-side "isAdmin" state is UI hint only, never trust.

**Availability.** Login and 2FA both go through Upstash rate limits — 5 attempts per 15 minutes per IP. When Upstash was decommissioned during a hosting migration and became unreachable, the site did the right thing: the rate-limit wrapper caught the DNS failure and returned `success: true`, allowing legitimate logins to continue. Rate limiting is defense in depth, not the primary gate — bcrypt + TOTP already make brute force impractical — so degrading it into "always allow" during an outage is correct. The alternative (fail closed, block everyone) would have locked me out of my own admin page.

### Access control lists and capability lists

The class covers ACLs (permissions stored *on the object*: file X has readers Alice and Bob) and C-Lists (permissions stored *on the subject*: Alice has read access to files X, Y, Z). The vault uses ACLs — the `is_public` boolean sits on each folder and each item, not on the visitor.

The reason is scale. There's only one privileged user (me), and everyone else is "public" — the identity dimension is basically two values. Storing permissions on the objects means visibility flips are one-column updates rather than mucking with a subject-permission relationship. If I ever add "share this folder with a specific person" (per-folder invite tokens, or friends-of-Collin auth), the model would push toward something more C-List shaped — capabilities attached to specific viewer identities.

### Authentication design

Three layers, each doing one thing.

**Password.** Stored as a bcrypt hash with cost factor 12. The bcrypt work factor is deliberately slow — a legitimate login pays about 300ms to verify; a brute-force attacker pays the same 300ms per guess. That's the whole point. `PBKDF2`/`scrypt`/`Argon2` all do the same trick with different math; bcrypt is fine at this scale.

**Second factor.** TOTP via `otplib`. The secret is stored server-side, encrypted in the DB. My phone (Authy) computes a 6-digit code based on the current 30-second window; the server checks against the same window plus one before and after to handle clock drift. Even if my password gets phished, the attacker also needs my phone.

**Rate limit.** 5 attempts per 15 minutes per IP on both `/api/auth/login` and `/api/auth/2fa/verify`. This turns a brute force from "millions of guesses per hour" into "a hundred and change per day, per IP." Not perfect against a distributed attacker rotating IPs, but the personal-site threat model doesn't include botnets. The point is to make casual attempts unprofitable.

### Design principles — least privilege, defense in depth

CS396's lecture on design principles is the one I think about most because it isn't a specific mechanism — it's a way of asking whether the thing you built has more privilege than it needs.

**Least privilege** shows up in Server Actions. Every mutating action in the site — creating a blog post, deleting a project, running `mkdir` in the vault terminal — is guarded by `requireCurrentUser()` at the top. Even though the route-level `middleware.ts` already gates `/admin/*` to signed-in users, the actions themselves don't trust that. If someone found a way to hit an action outside its usual page (e.g. through a rogue link or a compromised admin route), the action would still refuse. Every layer assumes the layers above it might fail.

**Defense in depth** is the same principle from a different angle. The vault has two auth boundaries — a shareable access code, and my admin session — because they defend against different threats. The code stops casual URL discovery ("what's at /vault?"). The admin session stops anyone with the code from *editing* things. Losing either one leaks less than losing both, and losing both would take two separate compromises.

## What shipped

The full list of security-flavored decisions currently live on the site:

- **Auth session:** `jose`-signed JWT in an `httpOnly`, `sameSite=lax`, `secure` (prod-only) cookie. `lax` rather than `strict` because Spotify OAuth callbacks need the cookie to survive a cross-site redirect; Server Actions' built-in CSRF protection covers the mutation surface.
- **Passwords:** bcryptjs at cost 12. Manual comparison via `bcrypt.compare` in constant time.
- **2FA:** `otplib` v12 TOTP. QR code generated with the `qrcode` package. Secret cleared from the DB on disable.
- **Rate limits:** Upstash sliding-window, 5/15min on login and 2FA verify. Fails open on Redis outage — logged but not blocking.
- **CSRF:** Free from Next.js Server Actions. They embed an encoded action ID that only matches when hit from the same origin.
- **XSS:** Zero `dangerouslySetInnerHTML` anywhere. All markdown goes through `react-markdown` which produces React elements, not raw HTML strings. Rehype-highlight adds classNames, doesn't inject scripts.
- **SQL injection:** Drizzle parameterizes every query. No template-string SQL anywhere. The one place I write raw SQL (the vault backfill migration) is a static file, not user-input-adjacent.
- **TLS:** Handled by Vercel. HTTPS-only in prod; the `secure` cookie flag flips based on `NODE_ENV`.
- **Secrets:** Never committed. `.env.local` gitignored, Vercel dashboard for prod values. Rotated Neon and Blob credentials once after accidentally pasting them in chat.

## What's next

Things I know I'm not doing yet:

- **Content Security Policy header.** Would tighten what scripts, fonts, and images the browser will load — reduces the blast radius of an XSS hole I don't know I have. Vercel makes this a one-line config; I just haven't done it.
- **Structured audit log.** Right now if someone breaks in, I have no forensic trail — no record of which admin action ran when. A tiny `admin_events` table + a middleware append on every mutation would fix it. Fits under the CIA "integrity" heading too (tamper-evident).
- **Session rotation on privilege escalation.** Best practice: when a user goes from "logged in with password" to "logged in with password + 2FA", the session cookie should be regenerated so an attacker with the pre-2FA cookie can't ride it into the higher-privilege state. I don't currently do this — the pending-2FA cookie gets replaced by the full session cookie, but if the attacker captured the pending one before 2FA, they could theoretically try to escalate. Lower priority (they'd still need my TOTP), but a real gap.
- **Deeper injection tests.** The class covers XSS, CSRF, and SQL injection later in the semester. I'll probably rerun my own site's inputs through those lenses when we hit the material and see what I missed.

Things the class covers that don't apply here:

- **Bell-LaPadula / Biba lattices.** Multi-level classified systems with formal information-flow rules. Cool theory, wrong shape for a two-user site.
- **Buffer overflows and memory corruption.** TypeScript + V8 + a managed runtime cover this. My exposure is exactly zero because I don't write C.
- **PKI and digital signatures at the network level.** Vercel and Let's Encrypt handle everything I'd need.

The overall shape of this exercise — building the thing while learning the theory of the thing — is worth doing on its own. Half the lecture concepts don't land until you're the person who has to decide whether to fail open or fail closed at 2am when the Redis provider is having a bad day. The other half are things I now know I'd never have thought of on my own. Fair trade.
