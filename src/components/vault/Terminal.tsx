"use client";

/**
 * Vault terminal — V.3.
 *
 * Changes from V.2:
 *   - Path model is now an arbitrary tree (Cwd = string[])
 *   - `ls` shows sub-folders AND files mixed together
 *   - Hidden folders/files render in red for guests; cat refuses to open them
 *   - Prompt user is "guest" when logged out, "Jyrinx" when logged in
 *   - Legacy /general keeps notes/ photos/ journal/ sub-dirs
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
  LEGACY_GENERAL_SLUG,
  formatPromptPath,
  resolvePath,
  walkTree,
  filesInCwd,
  isLegacyKindPath,
  type Cwd,
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
  | "listing"
  | "empty";

interface ListingItem {
  label: string;
  isDir: boolean;
  hidden: boolean;
}

interface OutputLine {
  id: number;
  type: LineType;
  text: string;
  promptPath?: string;
  file?: VaultFile;
  items?: ListingItem[];
  masked?: boolean;
}

type InputMode =
  | { kind: "normal" }
  | { kind: "email" }
  | { kind: "password"; email: string }
  | { kind: "twofa"; email: string }
  | { kind: "confirm"; onConfirm: () => Promise<void> | void };

let _id = 0;
function mkLine(
  type: LineType,
  text: string,
  extras?: Partial<OutputLine>,
): OutputLine {
  return { id: _id++, type, text, ...extras };
}

interface Props {
  vaultData: VaultData;
  initiallyAuthed: boolean;
  adminEmail: string | null;
}

const ADMIN_USERNAME = "Jyrinx";

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
    const echo = mode.kind === "password" ? "•".repeat(raw.length) : trimmed;
    const promptLabel = getPromptLabel(mode, cwd, isAdmin);
    const promptLine = mkLine("prompt", echo, {
      promptPath: promptLabel,
      masked: mode.kind === "password",
    });
    setInput("");

    // Multi-step auth
    if (mode.kind === "email") {
      if (!trimmed) {
        push(promptLine, [mkLine("error", "email required. login cancelled.")]);
        setMode({ kind: "normal" });
        return;
      }
      push(promptLine, []);
      setMode({ kind: "password", email: trimmed });
      return;
    }
    if (mode.kind === "password") {
      if (!raw) {
        push(promptLine, [mkLine("error", "password required. login cancelled.")]);
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
      push(null, [mkLine("ok", `signed in as ${mode.email}`)]);
      setIsAdmin(true);
      setCurrentEmail(mode.email);
      setMode({ kind: "normal" });
      router.refresh();
      return;
    }
    if (mode.kind === "twofa") {
      if (!trimmed) {
        push(promptLine, [mkLine("error", "code required.")]);
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

    // Normal mode
    if (!trimmed) {
      push(promptLine, []);
      return;
    }
    setCmdHistory((h) => [trimmed, ...h]);
    setHistoryIdx(-1);
    push(promptLine, []);

    const [head, ...rest] = trimmed.split(/\s+/);
    const arg = rest.join(" ");

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
        } else push(null, [mkLine("error", "logout failed")]);
        return;
      }
      if (sub === "whoami") {
        push(null, [
          mkLine("output", isAdmin
            ? `${currentEmail ?? ADMIN_USERNAME} (authenticated)`
            : "not logged in (guest)"),
        ]);
        return;
      }
      push(null, [mkLine("error", `admin: unknown '${sub ?? ""}'`)]);
      return;
    }

    if (head === "help") return push(null, helpLines(isAdmin));
    if (head === "pwd")
      return push(null, [mkLine("output", `/vault/${formatPromptPath(cwd)}`)]);
    if (head === "clear") {
      setLines([]);
      return;
    }
    if (head === "exit") {
      router.push("/");
      return;
    }

    if (head === "ls") {
      push(null, cmdLs(arg, cwd, vaultData, isAdmin));
      return;
    }
    if (head === "cd") {
      const result = cmdCd(arg, cwd, vaultData, isAdmin);
      if (result.error) push(null, [mkLine("error", result.error)]);
      else setCwd(result.cwd);
      return;
    }
    if (head === "cat") {
      push(null, cmdCat(arg, cwd, vaultData, isAdmin));
      return;
    }

    // Write commands
    const writeCmds = new Set(["mkdir", "rmdir", "touch", "rm"]);
    if (writeCmds.has(head!)) {
      if (!isAdmin) {
        push(null, [
          mkLine("error", `${head}: permission denied — run 'admin login'`),
        ]);
        return;
      }
      if (head === "mkdir") {
        const r = await mkdirAction({ cwd, arg });
        push(null, [renderCmdResult(r)]);
        if (r.ok) router.refresh();
        return;
      }
      if (head === "rmdir") {
        const r = await rmdirAction({ cwd, arg });
        push(null, [renderCmdResult(r)]);
        if (r.ok) router.refresh();
        return;
      }
      if (head === "touch") {
        const r = await touchAction({ cwd, arg });
        push(null, [renderCmdResult(r)]);
        if (r.ok) router.refresh();
        return;
      }
      if (head === "rm") {
        const localCwd = cwd;
        const name = arg;
        setMode({
          kind: "confirm",
          onConfirm: async () => {
            const r = await rmAction({ cwd: localCwd, arg: name });
            push(null, [renderCmdResult(r)]);
            if (r.ok) router.refresh();
          },
        });
        push(null, [mkLine("output", `delete '${name}'? type 'yes' to confirm.`)]);
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
      if (mode.kind !== "normal") return;
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

  const promptLabel = getPromptLabel(mode, cwd, isAdmin);
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

// ── Prompt ───────────────────────────────────────────────────────────────────

function getPromptLabel(mode: InputMode, cwd: Cwd, isAdmin: boolean): string {
  if (mode.kind === "email") return "email:";
  if (mode.kind === "password") return "password:";
  if (mode.kind === "twofa") return "2fa code:";
  if (mode.kind === "confirm") return "confirm:";
  const user = isAdmin ? ADMIN_USERNAME : "guest";
  return `${user}@vault:${formatPromptPath(cwd)}$`;
}

// ── ls ───────────────────────────────────────────────────────────────────────

function cmdLs(
  arg: string,
  cwd: Cwd,
  data: VaultData,
  isAdmin: boolean,
): OutputLine[] {
  const target = arg ? resolvePath(arg, cwd, data) : cwd;
  if (!target) return [mkLine("error", `ls: ${arg}: no such directory`)];

  const items: ListingItem[] = [];

  // Case A: root — list top-level folders
  if (target.length === 0) {
    for (const node of data.roots) {
      const hidden = !node.isPublic;
      if (hidden && !isAdmin) {
        items.push({ label: `${node.slug}/`, isDir: true, hidden: true });
      } else if (!hidden || isAdmin) {
        items.push({ label: `${node.slug}/`, isDir: true, hidden: !node.isPublic });
      }
    }
    if (items.length === 0) return [mkLine("output", "(no folders)")];
    return [mkLine("listing", "", { items })];
  }

  // Case B: legacy general root — show 3 kind sub-dirs
  if (target.length === 1 && target[0] === LEGACY_GENERAL_SLUG) {
    const node = walkTree(data, target);
    if (!node) return [mkLine("error", `ls: ${arg}: not found`)];
    for (const k of KINDS) {
      items.push({ label: `${k}/`, isDir: true, hidden: false });
    }
    // Also list any child folders (nested under /general)
    for (const child of node.children) {
      items.push({
        label: `${child.slug}/`,
        isDir: true,
        hidden: !child.isPublic,
      });
    }
    return [mkLine("listing", "", { items })];
  }

  // Case C: legacy general kind sub-dir — show files of that kind
  const legacy = isLegacyKindPath(target);
  if (legacy) {
    const files = filesInCwd(target, data);
    for (const f of files) {
      items.push({ label: f.name, isDir: false, hidden: !f.isPublic });
    }
    if (items.length === 0) return [mkLine("output", "(empty)")];
    return [mkLine("listing", "", { items })];
  }

  // Case D: normal folder — show sub-folders + files mixed
  const node = walkTree(data, target);
  if (!node) return [mkLine("error", `ls: ${arg}: not found`)];
  for (const child of node.children) {
    items.push({
      label: `${child.slug}/`,
      isDir: true,
      hidden: !child.isPublic,
    });
  }
  for (const f of node.files) {
    items.push({ label: f.name, isDir: false, hidden: !f.isPublic });
  }
  if (items.length === 0) return [mkLine("output", "(empty)")];
  return [mkLine("listing", "", { items })];
}

// ── cd ───────────────────────────────────────────────────────────────────────

function cmdCd(
  arg: string,
  cwd: Cwd,
  data: VaultData,
  isAdmin: boolean,
): { cwd: Cwd; error?: string } {
  if (!arg || arg === "~" || arg === "/") return { cwd: ROOT_CWD };
  const target = resolvePath(arg, cwd, data);
  if (!target) return { cwd, error: `cd: ${arg}: no such directory` };

  // Enforce hidden-folder gate for guests. Legacy kind sub-dirs inherit
  // /general's visibility (which is always true post-migration), so no
  // extra check needed there.
  if (!isAdmin && target.length > 0) {
    const node = walkTree(data, target);
    if (node && !node.isPublic) {
      return { cwd, error: `cd: ${arg}: permission denied` };
    }
  }
  return { cwd: target };
}

// ── cat ──────────────────────────────────────────────────────────────────────

function cmdCat(
  arg: string,
  cwd: Cwd,
  data: VaultData,
  isAdmin: boolean,
): OutputLine[] {
  if (!arg) return [mkLine("error", "cat: missing filename")];

  const files = filesInCwd(cwd, data);
  const file = files.find((f) => f.name === arg);
  if (!file) return [mkLine("error", `cat: ${arg}: no such file`)];

  if (!file.isPublic && !isAdmin) {
    return [mkLine("error", `cat: ${arg}: permission denied`)];
  }

  if (file.kind === "photos") {
    return [mkLine("photo", file.content, { file })];
  }
  return [mkLine("file", file.content, { file })];
}

// ── auth helpers (unchanged from V.2) ────────────────────────────────────────

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
  const finalUrl = new URL(res.url);
  if (finalUrl.pathname === "/admin") return { status: "success" };
  if (finalUrl.pathname === "/admin/login/2fa") return { status: "twofa-required" };
  const err = finalUrl.searchParams.get("error");
  if (err === "rate-limited") return { status: "rate-limited" };
  return { status: "invalid" };
}

async function doTwoFaVerify(code: string) {
  const fd = new FormData();
  fd.append("code", code);
  const res = await fetch("/api/auth/2fa/verify", { method: "POST", body: fd });
  const finalUrl = new URL(res.url);
  if (finalUrl.pathname === "/admin") return { ok: true as const };
  const err = finalUrl.searchParams.get("error");
  if (err === "rate-limited") return { ok: false as const, message: "rate limited." };
  return { ok: false as const, message: "invalid code." };
}

// ── Welcome + help + result rendering ────────────────────────────────────────

function helpLines(isAdmin: boolean): OutputLine[] {
  const base = [
    mkLine("output", "commands:"),
    mkLine("empty", ""),
    mkLine("output", "  ls [path]         list folder / files"),
    mkLine("output", "  cd <path>         change directory (supports .. and paths)"),
    mkLine("output", "  cat <file>        read a file"),
    mkLine("output", "  pwd               current path"),
    mkLine("output", "  clear             clear terminal"),
    mkLine("output", "  exit              return to main site"),
    mkLine("empty", ""),
    mkLine("output", "auth:"),
    mkLine("output", "  admin login       sign in for write access"),
    mkLine("output", "  admin logout      sign out"),
    mkLine("output", "  admin whoami      show current user"),
  ];
  if (isAdmin) {
    base.push(
      mkLine("empty", ""),
      mkLine("output", "admin commands:"),
      mkLine("output", "  mkdir <name>      create folder (accepts a/b/c for nested)"),
      mkLine("output", "  rmdir <name>      delete empty folder"),
      mkLine("output", "  touch <name>      new file (note; YYYY-MM-DD.md → journal)"),
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
    mkLine("welcome", "type 'help' for commands"),
  ];
  if (initiallyAuthed && email) {
    lines.push(mkLine("welcome", `admin session active: ${email}`));
  }
  lines.push(mkLine("empty", ""));
  return lines;
}

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

  if (l.type === "welcome") return <div style={{ color: "rgba(255,255,255,0.28)" }}>{l.text}</div>;
  if (l.type === "error") return <div style={{ color: "rgba(255,140,110,0.85)" }}>{l.text}</div>;
  if (l.type === "ok") return <div style={{ color: "rgba(180,220,150,0.85)" }}>{l.text}</div>;

  if (l.type === "listing" && l.items) {
    // Render each item inline, coloring hidden ones red. Two-space gap between items.
    return (
      <div style={{ color: "rgba(255,255,255,0.45)" }}>
        {l.items.map((it, i) => (
          <span key={i}>
            {i > 0 && "  "}
            <span
              style={{
                color: it.hidden
                  ? "rgba(255,110,90,0.9)"
                  : it.isDir
                    ? "rgba(160,200,255,0.8)"
                    : "rgba(255,255,255,0.55)",
              }}
            >
              {it.label}
            </span>
          </span>
        ))}
      </div>
    );
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
        {l.text}
      </div>
    );
  }

  return <div style={{ color: "rgba(255,255,255,0.45)" }}>{l.text}</div>;
}
