"use client";

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import {
  DIRS,
  resolvePath,
  formatPromptPath,
  type VaultData,
  type VaultFile,
} from "@/lib/vault/filesystem";

// ── Types ────────────────────────────────────────────────────────────────────

type LineType = "welcome" | "prompt" | "output" | "photo" | "file" | "error" | "empty";

interface OutputLine {
  id: number;
  type: LineType;
  text: string;
  promptPath?: string;
  file?: VaultFile;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

let _id = 0;
function mkLine(type: LineType, text: string, extras?: Partial<OutputLine>): OutputLine {
  return { id: _id++, type, text, ...extras };
}

// ── Command processor ─────────────────────────────────────────────────────────

function processCommand(
  input: string,
  cwd: string,
  vaultData: VaultData,
): { lines: OutputLine[]; newCwd: string; signal?: "clear" | "exit" | string } {
  const trimmed = input.trim();
  if (!trimmed) return { lines: [], newCwd: cwd };

  const [cmd, ...args] = trimmed.split(/\s+/);
  const arg = args[0] ?? "";

  switch (cmd) {
    case "ls": {
      const target = arg ? resolvePath(arg, cwd) : cwd;
      if (target === null) {
        return { lines: [mkLine("error", `ls: ${arg}: no such directory`)], newCwd: cwd };
      }
      if (target === "~") {
        return {
          lines: [mkLine("output", DIRS.map((d) => `${d}/`).join("  "))],
          newCwd: cwd,
        };
      }
      const dir = vaultData[target];
      if (!dir) {
        return { lines: [mkLine("error", `ls: ${target}: not found`)], newCwd: cwd };
      }
      if (dir.files.length === 0) {
        return { lines: [mkLine("output", "(empty)")], newCwd: cwd };
      }
      return {
        lines: [mkLine("output", dir.files.map((f) => f.name).join("  "))],
        newCwd: cwd,
      };
    }

    case "cd": {
      if (!arg || arg === "~" || arg === "/") return { lines: [], newCwd: "~" };
      const target = resolvePath(arg, cwd);
      if (target === null) {
        return { lines: [mkLine("error", `cd: ${arg}: no such directory`)], newCwd: cwd };
      }
      return { lines: [], newCwd: target };
    }

    case "cat": {
      if (!arg) return { lines: [mkLine("error", "cat: missing filename")], newCwd: cwd };

      let dirName = cwd === "~" ? null : cwd;
      let fileName = arg;

      if (arg.includes("/")) {
        const parts = arg.split("/");
        dirName = parts[0];
        fileName = parts[1];
      }

      if (!dirName) {
        return { lines: [mkLine("error", `cat: ${arg}: is a directory`)], newCwd: cwd };
      }

      const dir = vaultData[dirName];
      if (!dir) {
        return { lines: [mkLine("error", `cat: ${arg}: not found`)], newCwd: cwd };
      }

      const file = dir.files.find((f) => f.name === fileName);
      if (!file) {
        return { lines: [mkLine("error", `cat: ${fileName}: not found`)], newCwd: cwd };
      }

      // Photos get a special line type for inline image rendering
      if (file.kind === "photo") {
        return {
          lines: [mkLine("photo", file.content, { file })],
          newCwd: cwd,
        };
      }

      return { lines: [mkLine("file", file.content, { file })], newCwd: cwd };
    }

    case "open": {
      // open photos | open notes | open journal
      const target = arg.toLowerCase();
      if (!["photos", "notes", "journal"].includes(target)) {
        return {
          lines: [mkLine("error", `open: ${arg}: unknown. try: open photos, open notes, open journal`)],
          newCwd: cwd,
        };
      }
      return { lines: [], newCwd: cwd, signal: `navigate:/vault/home/${target}` };
    }

    case "pwd": {
      return {
        lines: [mkLine("output", `/home/collin/vault/${formatPromptPath(cwd)}`)],
        newCwd: cwd,
      };
    }

    case "clear":
      return { lines: [], newCwd: cwd, signal: "clear" };

    case "exit":
      return { lines: [], newCwd: cwd, signal: "exit" };

    case "help": {
      return {
        lines: [
          mkLine("output", "commands:"),
          mkLine("empty", ""),
          mkLine("output", "  ls [dir]          list files"),
          mkLine("output", "  cd <dir>          change directory"),
          mkLine("output", "  cat <file>        read a file"),
          mkLine("output", "  open <section>    open gallery (photos, notes, journal)"),
          mkLine("output", "  pwd               current path"),
          mkLine("output", "  clear             clear terminal"),
          mkLine("output", "  exit              return to main site"),
          mkLine("empty", ""),
          mkLine("output", "dirs:  notes/  photos/  journal/"),
        ],
        newCwd: cwd,
      };
    }

    default:
      return {
        lines: [mkLine("error", `${cmd}: command not found. try 'help'`)],
        newCwd: cwd,
      };
  }
}

// ── Welcome lines ─────────────────────────────────────────────────────────────

function makeWelcome(): OutputLine[] {
  const d = new Date();
  return [
    mkLine("welcome", `last login: ${d.toDateString()}`),
    mkLine("empty", ""),
    mkLine("welcome", "collin's vault — private archive"),
    mkLine("welcome", "type 'help' for available commands"),
    mkLine("empty", ""),
  ];
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  vaultData: VaultData;
}

export function VaultTerminal({ vaultData }: Props) {
  const router = useRouter();
  const [cwd, setCwd] = useState("~");
  const [lines, setLines] = useState<OutputLine[]>(makeWelcome);
  const [input, setInput] = useState("");
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [, setHistoryIdx] = useState(-1);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  const submit = useCallback(() => {
    const trimmed = input.trim();
    const promptLine = mkLine("prompt", trimmed, { promptPath: formatPromptPath(cwd) });

    if (!trimmed) {
      setLines((prev) => [...prev, promptLine]);
      setInput("");
      return;
    }

    const { lines: result, newCwd, signal } = processCommand(trimmed, cwd, vaultData);

    if (signal === "clear") {
      setLines([]);
      setCwd(newCwd);
      setInput("");
      setCmdHistory((h) => [trimmed, ...h]);
      setHistoryIdx(-1);
      return;
    }

    if (signal === "exit") {
      router.push("/");
      return;
    }

    if (signal?.startsWith("navigate:")) {
      setLines((prev) => [...prev, promptLine]);
      router.push(signal.replace("navigate:", ""));
      return;
    }

    setLines((prev) => [...prev, promptLine, ...result]);
    setCwd(newCwd);
    setInput("");
    setCmdHistory((h) => [trimmed, ...h]);
    setHistoryIdx(-1);
  }, [input, cwd, vaultData, router]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        submit();
      } else if (e.key === "ArrowUp") {
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
          setInput(next === -1 ? "" : (cmdHistory[next] ?? ""));
          return next;
        });
      }
    },
    [submit, cmdHistory],
  );

  const prompt = `collin@vault:${formatPromptPath(cwd)}$`;

  return (
    <div
      className="flex min-h-[100vh] flex-col px-6 py-8 cursor-text"
      style={{ fontFamily: "ui-monospace, monospace", fontSize: "13px", maxWidth: "760px", margin: "0 auto" }}
      onClick={() => inputRef.current?.focus()}
    >
      <div className="flex flex-1 flex-col gap-[3px]">
        {lines.map((l) => (
          <TerminalLine key={l.id} line={l} />
        ))}
      </div>

      {/* Input row */}
      <div className="mt-1 flex items-center gap-2">
        <span style={{ color: "rgba(255,255,255,0.4)", userSelect: "none" }}>
          {prompt}
        </span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className="flex-1 bg-transparent outline-none border-none caret-white"
          style={{ color: "rgba(255,255,255,0.85)", fontFamily: "inherit", fontSize: "inherit" }}
          aria-label="terminal input"
        />
      </div>

      <div ref={bottomRef} />
    </div>
  );
}

// ── Line renderers ────────────────────────────────────────────────────────────

function TerminalLine({ line: l }: { line: OutputLine }) {
  if (l.type === "empty") return <div style={{ height: "0.6em" }} />;

  if (l.type === "prompt") {
    return (
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <span style={{ color: "rgba(255,255,255,0.35)", userSelect: "none", flexShrink: 0 }}>
          collin@vault:{l.promptPath}$
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

  if (l.type === "photo" && l.file?.url) {
    return (
      <div style={{ margin: "0.75rem 0", display: "inline-block" }}>
        {/* Polaroid-style frame */}
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
                <div style={{ color: "rgba(255,255,255,0.25)", fontSize: "11px", marginBottom: "2px" }}>
                  {l.file.createdAt}
                </div>
              )}
              {l.file.content && (
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", lineHeight: 1.5 }}>
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
          <div style={{ color: "rgba(255,255,255,0.22)", fontSize: "11px", marginBottom: "4px" }}>
            {l.file.createdAt}
          </div>
        )}
        {l.text}
      </div>
    );
  }

  // output
  return <div style={{ color: "rgba(255,255,255,0.45)" }}>{l.text}</div>;
}
