## The problem

The old vault worked. It just didn't scale.

When I shipped it a couple months ago, the model was three hardcoded sections — photos, notes, journal — and every entry landed in one of them. That was fine at ten items. It got weird around thirty. A photo of a climb from last year, a note about a piano piece, a journal entry from that same trip — all three logically belonged together, but they lived in three different directories with no way to say "this is one collection."

The admin surface had the same problem. `/admin/vault` had three separate forms for the three types. Every entry meant picking which form to open. If I forgot which type something was, I had to check three lists.

None of that was catastrophic. It was just always slightly the wrong shape.

## The approach

Two changes, both bigger than they sound.

**Folders as first-class citizens.** Every note, photo, and journal entry now belongs to a folder. Folders can nest inside other folders. `Climbing 2025` can contain `Rock Hill Trip` which contains three photos, a journal entry, and a note about beta — all in one place because they belong together. The old three-section split still exists inside a special legacy folder called `general/`, mostly so I didn't lose anything I'd already written.

**The terminal is the admin.** The old `/admin/vault` page — the one with the three forms and the file inputs — is gone. In its place: type `admin login` at the terminal prompt, get walked through email → password → 2FA, and now you can run `mkdir`, `touch`, `rm`, `rmdir`. Everything you used to click, you type. Guests still land on the same terminal — they just get a `permission denied` if they try anything mutating.

The terminal already existed for read-only browsing. Making it the write surface too meant fewer moving pieces (no more form UIs to keep in sync with the terminal's mental model) and more consistency (one path, one prompt, one command grammar).

**Hidden items in red.** Any folder or file can be flipped private with `is_public = false`. Guests still see it exists — the name shows up in red on `ls` — but they can't `cd` into a private folder or `cat` a private file. Admin sees everything as normal. This is the mechanism for the "I want to share this specific thing but keep the rest locked" flow that eventually gets its own console command.

## What shipped

Three PRs across two days:

https://github.com/itscollinvo/jiggletacoexpress/pull/26

Ships the `vault_folders` table, folder_id foreign keys on the three item tables, and a data migration that dropped every pre-existing item into a default `general/` folder. Backfill was in the same SQL transaction as the schema change — atomic, no half-migrated state.

The follow-up brought the read model into the terminal and added the auth + write commands:

https://github.com/itscollinvo/jiggletacoexpress/pull/28

`admin login` runs the same email/password/2FA flow the `/admin/login` page uses — same endpoints, same rate limits, same session cookie. I didn't build a new auth mechanism; I just wrapped the existing one in a terminal state machine that prompts for each piece.

Then the model shift that made everything click:

https://github.com/itscollinvo/jiggletacoexpress/pull/30

Nested folders. `Cwd` became a `string[]` path array so `cd climbing/2025/rock-hill-trip` is one command, and folders can live inside other folders forever. The old flat "every folder has notes/photos/journal sub-dirs" model got scrapped for a normal filesystem shape. Legacy `general/` still shows the sub-dirs so pre-refactor content isn't hidden.

## What's next

Things I know are coming:

- A `chmod` or `hide`/`show` command to flip the `is_public` flag from inside the terminal. Right now the schema is there but you have to edit a row directly in Neon Studio, which is comedy.
- `upload` for photos. The terminal can't `touch photo.jpg` because photos need actual image bytes — the command will trigger a hidden file picker, upload to Vercel Blob, and register the row.
- `edit <file>` — an inline modal textarea for editing note bodies without leaving the terminal.
- `mv <src> <dst>` — moving files between folders.

Things I probably won't build:

- Public sharing on individual URLs. The original plan had a "publicly-shared folder grid" concept for `/vault` that anyone could hit without a code. I decided against it — the vault is deliberately private, and I like that visiting `/vault` from a random link doesn't reveal anything about what's inside.
- Nested folder depth limits. There isn't one. If you want `~/a/b/c/d/e/f/g/h.md`, you get `~/a/b/c/d/e/f/g/h.md`. The terminal handles it, the DB doesn't care, and I'll notice if it gets weird before it gets bad.

The vault feels like mine now. Which is the point.
