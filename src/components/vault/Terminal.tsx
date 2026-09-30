"use client";

/**
 * Vault terminal — V.2.
 *
 * Path model (see src/lib/vault/filesystem.ts):
 *   ~                     root, shows folders
 *   ~/<folder>            inside a folder, shows notes/ photos/ journal/
 *   ~/<folder>/<kind>     inside a kind dir, shows files
 *
 * Auth model:
 *   `initiallyAuthed` prop tells us if the visitor already has an admin
 *   session cookie. `admin login` runs a client-driven multi-step prompt
 *   that hits /api/auth/login and /api/auth/2fa/verify — same endpoints
 *   the /admin/login form uses. On success we set `isAdmin` and unlock
 *   write commands (mkdir, rmdir, touch, rm).
 *
 * Input modes:
 *   normal  — regular command entry
 *   email   — waiting for email input (part of admin login flow)
 *   password— waiting for password (masked)
 *   twofa   — waiting for TOTP code
 *   confirm — waiting for "yes"/"no" (rm confirmation)
 */

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  KINDS,
  ROOT_CWD,
  formatPromptPath,
  resolvePath,
  getFolder,
  getFilesInKind,
  type Cwd,
  type FileKind,
  type VaultData,
  type VaultFile,
} from "@/lib/vault/filesystem";
import {
  mkdirAction,
  rmdirAction,
  touchAction,
  rmAction,
  type CmdResult,
} from "@/app/vault/actions";

// ── Types ────────────────────────────────────────────────────────────────────

type LineType =
  | "welcome"
  | "prompt"
  | "output"
  | "photo"
  | "file"
  | "error"
  | "ok"
  | "empty";

interface OutputLine {
  id: number;
  type: LineType;
  text: string;
  promptPath?: string;
  file?: VaultFile;
  /** For prompt lines, whether the input was masked (e.g. password). */
  masked?: boolean;
}

type InputMode =
  | { kind: "normal" }
  | { kind: "email" }
  | { kind: "password"; email: string }
  | { kind: "twofa"; email: string }
  | { kind: "confirm"; onConfirm: () => Promise<void> | void };

// ── Line factory ────────────────────────────────────────────────────────────

let _id = 0;
function mkLine(
  type: LineType,
  text: string,
  extras?: Partial<OutputLine>,
): OutputLine {
  return { id: _id++, type, text, ...extras };
}

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  vaultData: VaultData;
  initiallyAuthed: boolean;
  adminEmail: string | null;
}

export function VaultTerminal({
  vaultData,
  initiallyAuthed,
  adminEmail,
}: Props) {
  const router = useRouter();
  const [cwd, setCwd] = useState<Cwd>(ROOT_CWD);
  const [isAdmin, setIsAdmin] = useState(initiallyAuthed);
  const [currentEmail, setCurrentEmail] = useState<string | null>(adminEmail);
  const [mode, setMode] = useState<InputMode>({ kind: "normal" });
  const [input, setInput] = useState("");
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [, setHistoryIdx] = useState(-1);
  const [lines, setLines] = useState<OutputLine[]>(() =>
    makeWelcome(initiallyAuthed, adminEmail),
  );

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  /** Push output lines after echoing the prompt/input line. */
  const push = useCallback(
    (promptLine: OutputLine | null, output: OutputLine[]) => {
      setLines((prev) => [
        ...prev,
        ...(promptLine ? [promptLine] : []),
        ...output,
      ]);
    },
    [],
  );

  const submit = useCallback(async () => {
    const raw = input;
    const trimmed = raw.trim();

    // Echo. Masked modes render bullets instead of the actual text so
    // over-shoulder viewers don't see passwords.
    const echo = mode.kind === "password"
      ? "•".repeat(raw.length)
      : trimmed;
    const promptLabel = getPromptLabel(mode, cwd, currentEmail);
    const promptLine = mkLine("prompt", echo, {
      promptPath: promptLabel,
      masked: mode.kind === "password",
    });

    setInput("");

    // Mode-dispatched handling.
    if (mode.kind === "email") {
      if (!trimmed) {
        push(promptLine, [
          mkLine("error", "email required. login cancelled."),
        ]);
        setMode({ kind: "normal" });
        return;
      }
      push(promptLine, []);
      setMode({ kind: "password", email: trimmed });
      return;
    }

    if (mode.kind === "password") {
      if (!raw) {
        push(promptLine, [
          mkLine("error", "password required. login cancelled."),
        ]);
        setMode({ kind: "normal" });
        return;
      }
      push(promptLine, [mkLine("output", "verifying...")]);
      const result = await doPasswordLogin(mode.email, raw);
      if (result.status === "invalid") {
        push(null, [mkLine("error", "invalid credentials.")]);
        setMode({ kind: "normal" });
        return;
      }
      if (result.status === "rate-limited") {
        push(null, [mkLine("error", "rate limited. wait a few minutes.")]);
        setMode({ kind: "normal" });
        return;
      }
      if (result.status === "twofa-required") {
        push(null, [mkLine("output", "2FA required.")]);
        setMode({ kind: "twofa", email: mode.email });
        return;
      }
      // success
      push(null, [mkLine("ok", `signed in as ${mode.email}`)]);
      setIsAdmin(true);
      setCurrentEmail(mode.email);
      setMode({ kind: "normal" });
      router.refresh();
      return;
    }

    if (mode.kind === "twofa") {
      if (!trimmed) {
        push(promptLine, [mkLine("error", "code required. login cancelled.")]);
        setMode({ kind: "normal" });
        return;
      }
      push(promptLine, [mkLine("output", "verifying...")]);
      const result = await doTwoFaVerify(trimmed);
      if (!result.ok) {
        push(null, [mkLine("error", result.message)]);
        setMode({ kind: "normal" });
        return;
      }
      push(null, [mkLine("ok", `signed in as ${mode.email}`)]);
      setIsAdmin(true);
      setCurrentEmail(mode.email);
      setMode({ kind: "normal" });
      router.refresh();
      return;
    }

    if (mode.kind === "confirm") {
      push(promptLine, []);
      if (trimmed.toLowerCase() === "yes" || trimmed.toLowerCase() === "y") {
        await mode.onConfirm();
      } else {
        push(null, [mkLine("output", "cancelled.")]);
      }
      setMode({ kind: "normal" });
      return;
    }

    // Normal command mode.
    if (!trimmed) {
      push(promptLine, []);
      return;
    }
    setCmdHistory((h) => [trimmed, ...h]);
    setHistoryIdx(-1);
    push(promptLine, []);

    const [head, ...rest] = trimmed.split(/\s+/);
    const arg = rest.join(" ");

    // Auth commands
    if (head === "admin") {
      const sub = rest[0];
      if (sub === "login") {
        push(null, [mkLine("output", "email:")]);
        setMode({ kind: "email" });
        return;
      }
      if (sub === "logout") {
        const res = await fetch("/api/auth/logout", { method: "POST" });
        if (res.ok) {
          setIsAdmin(false);
          setCurrentEmail(null);
          push(null, [mkLine("ok", "signed out.")]);
          router.refresh();
        } else {
          push(null, [mkLine("error", "logout failed")]);
        }
        return;
      }
      if (sub === "whoami") {
        push(null, [
          mkLine("output", isAdmin
            ? `${currentEmail ?? "admin"} (authenticated)`
            : "not logged in"),
        ]);
        return;
      }
      push(null, [
        mkLine("error", `admin: unknown subcommand '${sub ?? ""}' — try admin login/logout/whoami`),
      ]);
      return;
    }

    // Read-only commands
    if (head === "help") return push(null, helpLines(isAdmin));
    if (head === "pwd")
      return push(null, [mkLine("output", `/home/collin/vault/${formatPromptPath(cwd)}`)]);
    if (head === "clear") {
      setLines([]);
      return;
    }
    if (head === "exit") {
      router.push("/");
      return;
    }

    if (head === "ls") {
      push(null, cmdLs(arg, cwd, vaultData));
      return;
    }
    if (head === "cd") {
      const result = cmdCd(arg, cwd, vaultData);
      if (result.error) push(null, [mkLine("error", result.error)]);
      else setCwd(result.cwd);
      return;
    }
    if (head === "cat") {
      push(null, cmdCat(arg, cwd, vaultData));
      return;
    }

    // Admin-only write commands
    const writeCmds = new Set(["mkdir", "rmdir", "touch", "rm"]);
    if (writeCmds.has(head!)) {
      if (!isAdmin) {
        push(null, [
          mkLine("error", `${head}: permission denied — run 'admin login'`),
        ]);
        return;
      }
      if (head === "mkdir") {
        const r = await mkdirAction(arg);
        push(null, [renderCmdResult(r)]);
        if (r.ok) router.refresh();
        return;
      }
      if (head === "rmdir") {
        const r = await rmdirAction(arg);
        push(null, [renderCmdResult(r)]);
        if (r.ok) router.refresh();
        return;
      }
      if (head === "touch") {
        if (!cwd.folder || !cwd.kind) {
          push(null, [
            mkLine("error", "touch: cd into a folder/kind first (e.g. cd general/notes)"),
          ]);
          return;
        }
        const r = await touchAction({
          folderSlug: cwd.folder,
          kind: cwd.kind,
          name: arg,
        });
        push(null, [renderCmdResult(r)]);
        if (r.ok) router.refresh();
        return;
      }
      if (head === "rm") {
        if (!cwd.folder || !cwd.kind) {
          push(null, [
            mkLine("error", "rm: cd into a folder/kind first"),
          ]);
          return;
        }
        const folderSlug = cwd.folder;
        const kind = cwd.kind;
        const name = arg;
        setMode({
          kind: "confirm",
          onConfirm: async () => {
            const r = await rmAction({ folderSlug, kind, name });
            push(null, [renderCmdResult(r)]);
            if (r.ok) router.refresh();
          },
        });
        push(null, [
          mkLine("output", `delete '${name}'? type 'yes' to confirm.`),
        ]);
        return;
      }
    }

    push(null, [mkLine("error", `${head}: command not found. try 'help'`)]);
  }, [input, mode, cwd, vaultData, isAdmin, currentEmail, push, router]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        void submit();
        return;
      }
      if (mode.kind !== "normal") return; // history only in normal mode
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHistoryIdx((idx) => {
          const next = Math.min(idx + 1, cmdHistory.length - 1);
          setInput(cmdHistory[next] ?? "");
          return next;
        });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setHistoryIdx((idx) => {
          const next = Math.max(idx - 1, -1);
          setInput(next === -1 ? "" : cmdHistory[next] ?? "");
          return next;
        });
      }
    },
    [submit, cmdHistory, mode],
  );

  const promptLabel = getPromptLabel(mode, cwd, currentEmail);
  const inputType = mode.kind === "password" ? "password" : "text";

  return (
    <div
      className="flex min-h-[100vh] flex-col px-6 py-8 cursor-text"
      style={{
        fontFamily: "ui-monospace, monospace",
        fontSize: "13px",
        maxWidth: "760px",
        margin: "0 auto",
      }}
      onClick={() => inputRef.current?.focus()}
    >
      <div className="flex flex-1 flex-col gap-[3px]">
        {lines.map((l) => (
          <TerminalLine key={l.id} line={l} />
        ))}
      </div>

      <div className="mt-1 flex items-center gap-2">
        <span style={{ color: "rgba(255,255,255,0.4)", userSelect: "none" }}>
          {promptLabel}
        </span>
        <input
          ref={inputRef}
          type={inputType}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className="flex-1 bg-transparent outline-none border-none caret-white"
          style={{
            color: "rgba(255,255,255,0.85)",
            fontFamily: "inherit",
            fontSize: "inherit",
          }}
          aria-label="terminal input"
        />
      </div>

      <div ref={bottomRef} />
    </div>
  );
}

// ── Prompt label ─────────────────────────────────────────────────────────────

function getPromptLabel(mode: InputMode, cwd: Cwd, email: string | null): string {
  if (mode.kind === "email") return "email:";
  if (mode.kind === "password") return "password:";
  if (mode.kind === "twofa") return "2fa code:";
  if (mode.kind === "confirm") return "confirm:";
  const who = email ? `${email.split("@")[0]}` : "collin";
  return `${who}@vault:${formatPromptPath(cwd)}$`;
}

// ── Command implementations ──────────────────────────────────────────────────

function cmdLs(arg: string, cwd: Cwd, data: VaultData): OutputLine[] {
  const target = arg ? resolvePath(arg, cwd, data) : cwd;
  if (!target) return [mkLine("error", `ls: ${arg}: no such directory`)];

  if (!target.folder) {
    // Root — list folders
    if (data.folders.length === 0) return [mkLine("output", "(no folders)")];
    return [mkLine("output", data.folders.map((f) => `${f.slug}/`).join("  "))];
  }
  const folder = getFolder(target.folder, data);
  if (!folder) return [mkLine("error", `ls: ${target.folder}: not found`)];

  if (!target.kind) {
    // In a folder — list kind dirs
    return [mkLine("output", KINDS.map((k) => `${k}/`).join("  "))];
  }
  const files = getFilesInKind(folder, target.kind);
  if (files.length === 0) return [mkLine("output", "(empty)")];
  return [mkLine("output", files.map((f) => f.name).join("  "))];
}

function cmdCd(
  arg: string,
  cwd: Cwd,
  data: VaultData,
): { cwd: Cwd; error?: string } {
  if (!arg || arg === "~" || arg === "/") return { cwd: ROOT_CWD };
  const target = resolvePath(arg, cwd, data);
  if (!target) return { cwd, error: `cd: ${arg}: no such directory` };
  return { cwd: target };
}

function cmdCat(arg: string, cwd: Cwd, data: VaultData): OutputLine[] {
  if (!arg) return [mkLine("error", "cat: missing filename")];

  // Two shapes: `cat file.md` while in a kind dir, or `cat folder/kind/file.md`.
  let folderSlug = cwd.folder;
  let kind = cwd.kind;
  let fileName = arg;
  if (arg.includes("/")) {
    const parts = arg.split("/").filter(Boolean);
    if (parts.length === 3) {
      folderSlug = parts[0]!;
      if (!(KINDS as string[]).includes(parts[1]!)) {
        return [mkLine("error", `cat: ${arg}: invalid path`)];
      }
      kind = parts[1] as FileKind;
      fileName = parts[2]!;
    } else if (parts.length === 2) {
      // <kind>/<file> — assume we're already in a folder
      if (!folderSlug) return [mkLine("error", `cat: ${arg}: cd into a folder first`)];
      if (!(KINDS as string[]).includes(parts[0]!)) {
        return [mkLine("error", `cat: ${arg}: invalid path`)];
      }
      kind = parts[0] as FileKind;
      fileName = parts[1]!;
    } else {
      return [mkLine("error", `cat: ${arg}: invalid path`)];
    }
  }

  if (!folderSlug || !kind) {
    return [mkLine("error", `cat: ${arg}: cd into a folder/kind first`)];
  }

  const folder = getFolder(folderSlug, data);
  if (!folder) return [mkLine("error", `cat: ${folderSlug}: no such folder`)];

  const file = getFilesInKind(folder, kind).find((f) => f.name === fileName);
  if (!file) return [mkLine("error", `cat: ${fileName}: no such file`)];

  if (file.kind === "photos") {
    return [mkLine("photo", file.content, { file })];
  }
  return [mkLine("file", file.content, { file })];
}

// ── Client-side auth helpers ────────────────────────────────────────────────

async function doPasswordLogin(
  email: string,
  password: string,
): Promise<
  | { status: "success" }
  | { status: "twofa-required" }
  | { status: "invalid" }
  | { status: "rate-limited" }
> {
  const fd = new FormData();
  fd.append("email", email);
  fd.append("password", password);
  const res = await fetch("/api/auth/login", { method: "POST", body: fd });
  // The API redirects: 303 → /admin (success) or 303 → /admin/login?error=...
  // Fetch follows redirects; the final URL tells us the outcome.
  const finalUrl = new URL(res.url);
  if (finalUrl.pathname === "/admin") return { status: "success" };
  if (finalUrl.pathname === "/admin/login/2fa") return { status: "twofa-required" };
  const err = finalUrl.searchParams.get("error");
  if (err === "rate-limited") return { status: "rate-limited" };
  return { status: "invalid" };
}

async function doTwoFaVerify(
  code: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const fd = new FormData();
  fd.append("code", code);
  const res = await fetch("/api/auth/2fa/verify", { method: "POST", body: fd });
  const finalUrl = new URL(res.url);
  if (finalUrl.pathname === "/admin") return { ok: true };
  const err = finalUrl.searchParams.get("error");
  if (err === "rate-limited") return { ok: false, message: "rate limited." };
  return { ok: false, message: "invalid code." };
}

// ── Help + welcome ──────────────────────────────────────────────────────────

function helpLines(isAdmin: boolean): OutputLine[] {
  const base = [
    mkLine("output", "commands:"),
    mkLine("empty", ""),
    mkLine("output", "  ls [path]         list folder or files"),
    mkLine("output", "  cd <path>         change directory (folder, folder/kind, ..)"),
    mkLine("output", "  cat <file>        read a file"),
    mkLine("output", "  pwd               current path"),
    mkLine("output", "  clear             clear terminal"),
    mkLine("output", "  exit              return to main site"),
    mkLine("empty", ""),
    mkLine("output", "auth:"),
    mkLine("output", "  admin login       sign in for write access"),
    mkLine("output", "  admin logout      sign out"),
    mkLine("output", "  admin whoami      show current admin"),
  ];
  if (isAdmin) {
    base.push(
      mkLine("empty", ""),
      mkLine("output", "admin commands:"),
      mkLine("output", "  mkdir <slug>      create folder"),
      mkLine("output", "  rmdir <slug>      delete empty folder"),
      mkLine("output", "  touch <name>      new note/journal (in a kind dir)"),
      mkLine("output", "  rm <name>         delete a file (with confirm)"),
    );
  }
  return base;
}

function makeWelcome(
  initiallyAuthed: boolean,
  email: string | null,
): OutputLine[] {
  const d = new Date();
  const lines: OutputLine[] = [
    mkLine("welcome", `last login: ${d.toDateString()}`),
    mkLine("empty", ""),
    mkLine("welcome", "collin's vault — private archive"),
    mkLine("welcome", "type 'help' for available commands"),
  ];
  if (initiallyAuthed && email) {
    lines.push(mkLine("welcome", `admin session active: ${email}`));
  }
  lines.push(mkLine("empty", ""));
  return lines;
}

// ── Result renderer ─────────────────────────────────────────────────────────

function renderCmdResult(r: CmdResult): OutputLine {
  if (r.ok) return mkLine("ok", r.message ?? "ok");
  return mkLine("error", r.message);
}

// ── Line renderers ──────────────────────────────────────────────────────────

function TerminalLine({ line: l }: { line: OutputLine }) {
  if (l.type === "empty") return <div style={{ height: "0.6em" }} />;

  if (l.type === "prompt") {
    return (
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <span
          style={{
            color: "rgba(255,255,255,0.35)",
            userSelect: "none",
            flexShrink: 0,
          }}
        >
          {l.promptPath}
        </span>
        <span style={{ color: "rgba(255,255,255,0.75)" }}>{l.text}</span>
      </div>
    );
  }

  if (l.type === "welcome") {
    return <div style={{ color: "rgba(255,255,255,0.28)" }}>{l.text}</div>;
  }

  if (l.type === "error") {
    return <div style={{ color: "rgba(255,140,110,0.85)" }}>{l.text}</div>;
  }

  if (l.type === "ok") {
    return <div style={{ color: "rgba(180,220,150,0.85)" }}>{l.text}</div>;
  }

  if (l.type === "photo" && l.file?.url) {
    return (
      <div style={{ margin: "0.75rem 0", display: "inline-block" }}>
        <div
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "2px",
            padding: "8px 8px 28px 8px",
            display: "inline-block",
            maxWidth: "280px",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={l.file.url}
            alt={l.file.content}
            style={{ display: "block", width: "100%", borderRadius: "1px" }}
          />
          {(l.file.content || l.file.createdAt) && (
            <div style={{ marginTop: "10px", padding: "0 2px" }}>
              {l.file.createdAt && (
                <div
                  style={{
                    color: "rgba(255,255,255,0.25)",
                    fontSize: "11px",
                    marginBottom: "2px",
                  }}
                >
                  {l.file.createdAt}
                </div>
              )}
              {l.file.content && (
                <div
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontSize: "12px",
                    lineHeight: 1.5,
                  }}
                >
                  {l.file.content}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (l.type === "file") {
    return (
      <div
        style={{
          margin: "0.5rem 0",
          padding: "0.6rem 1rem",
          borderLeft: "2px solid rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.55)",
          whiteSpace: "pre-wrap",
          lineHeight: 1.7,
        }}
      >
        {l.file?.createdAt && (
          <div
            style={{
              color: "rgba(255,255,255,0.22)",
              fontSize: "11px",
              marginBottom: "4px",
            }}
          >
            {l.file.createdAt}
          </div>
        )}
        {l.text}
      </div>
    );
  }

  return <div style={{ color: "rgba(255,255,255,0.45)" }}>{l.text}</div>;
}
