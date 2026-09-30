# Vault refactor plan (revised)

Turns the vault from a fixed three-section area (photos / notes / journal at hardcoded paths) into a folder-based filesystem where the admin can create/delete folders and files through terminal commands. Access model stays as it is: the vault access code gates entry; admin session bypasses the code.

Two phases, both shippable independently.

---

## Design decisions locked

- **Access model unchanged.** `/vault` still shows the code-entry page. Enter the code → `/vault/home`. What you see there is identical whether you're admin or guest.
- **Admin session bypasses the vault code.** If your admin cookie is already set, `/vault` redirects straight to `/vault/home`. One less step for the person who edits.
- **Folders CONTAIN items.** New concept. Notes / photos / journal each get a `folder_id` FK. Existing content migrates into a default "General" folder.
- **Admin surface is the terminal.** No more `/admin/vault` web forms — deleted in V.2. Everything happens via commands.
- **Elevated privileges via `admin login` in the terminal.** Multi-step prompt (email → password → 2FA code) sets the same admin session cookie that `/admin/login` sets. Write commands unlock instantly.
- **Basic write command set:** `mkdir`, `rmdir`, `touch`, `rm`. Anything more (edit, upload, mv) is a follow-up phase if you want it later.
- **No public folder concept.** The `is_public` column on `vault_folders` stays in the schema as future-proofing (in case you later want a "shareable folder" mode) but nothing reads it in V.1/V.2.

## Non-goals

- Public folder grid on `/vault` (dropped from original plan)
- Ctrl+K console on other pages (dropped — the vault terminal is enough)
- Inline editor / upload / move commands (deferred — request them explicitly later)
- Removing the vault access code (kept indefinitely)

---

## Phase V.1: Folder schema + data migration

Already in progress on branch `v5/v1-folder-schema`. No changes needed from the version I already wrote — the schema I put in place is a superset of what V.2 needs.

- New `vault_folders` table
- `folder_id` FK (nullable) on `vault_photos` / `vault_notes` / `vault_journal`
- Data migration appended to the generated SQL creates a "General" folder and backfills every existing row

**Ship as:** `v5/v1-folder-schema` (already open)

---

## Phase V.2: Folders in terminal + admin auth + write commands

Where the visible change happens. Splits into three logical chunks that all ship in one PR because they touch shared code.

### V.2a — Read the folder tree

- Terminal navigation updated so `ls` at `/vault/home` shows every folder (from the DB) instead of a hardcoded three
- `cd <folder>` enters a folder; `ls` inside shows notes, photos, journal entries belonging to that folder
- `cat <file>` and `open <file>` behavior unchanged, just scoped to the current folder

### V.2b — `admin login` in the terminal

- New command: `admin login`. Prompts email, then password (masked), then TOTP code. On success, sets the same `jt_session` cookie as `/admin/login`. Fails go through the same rate-limit paths (`loginRateLimit`, `twoFaRateLimit`) — no new attack surface.
- `admin logout` — clears the cookie via a `/api/auth/logout` call
- `admin whoami` — echoes current admin email, or `not logged in`
- Terminal reads the cookie on mount so a pre-existing session unlocks writes immediately

### V.2c — Write commands (admin-only)

- `mkdir <name>` — creates a new folder. Validates slug (kebab-case, no reserved names like `admin`/`api`/`login`).
- `rmdir <name>` — deletes an empty folder. Refuses if it contains any note/photo/journal (the DB `ON DELETE RESTRICT` catches it too).
- `touch <name>` — creates a new file in the current folder. If `cwd` is `notes/` inside a folder, creates a note with the given slug; if `journal/`, creates a journal entry keyed by the argument.
- `rm <name>` — deletes the specified item. Confirms first (`rm confirm` or `--yes`).

All four commands hit new server actions in `src/app/vault/actions.ts`, each guarded by `requireCurrentUser()`. Guest attempts get `permission denied: run 'admin login' first`.

### V.2d — Delete `/admin/vault` web UI

Since the terminal is now the source of truth, remove:
- `src/app/admin/vault/**` (all routes, forms, actions)
- The "Vault" card on `/admin`

Existing routes that other files reference — grep for them and update.

### V.2e — `/vault` admin bypass

- `/vault/page.tsx` checks for the admin session cookie on the server. If present, redirect straight to `/vault/home`. Otherwise show the existing code-entry page.

**Ship as:** `v5/v2-vault-terminal`

---

## Order of operations

```
V.1  Folder schema + backfill        ← already in progress
V.2  Terminal folders + auth + writes ← lands after V.1 merges
```

---

## Open questions to answer inline as we go

- **Should `touch` in a folder create a note or a journal entry by default?** Suggest: `touch some-name` creates a note if you're at `folder/`, or a journal entry if you're at `folder/journal/`. The context of `cwd` decides.
- **Confirmation on `rm`?** Suggest: `rm file.md` shows "type 'rm file.md --yes' to confirm". Prevents fat-finger deletes without needing a modal.
- **Where does the /now-updated blog post about this land?** Add "Update, 2026" note to the vault-launch post about the refactor. New post when V.2 ships.

---

## Future work (parking lot — not planned yet)

- `edit <name>` — inline modal textarea editor for a note/journal body
- `upload` — triggers a hidden file input for photo uploads
- `mv <src> <dst>` — move files between folders
- "Guest link" mechanism — the "directive to go to /vault/home for non admins" you mentioned. Requires a design pass separately.
- Public folder flag — `is_public` is in the schema, no code reads it yet
