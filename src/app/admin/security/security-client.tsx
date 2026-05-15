"use client";

/**
 * Interactive 2FA enable/disable UI.
 *
 * Two flows:
 *   - Enable: POST /api/auth/2fa/setup → render QR + manual key →
 *             user scans + enters code → POST /api/auth/2fa/confirm.
 *   - Disable: user enters current code → POST /api/auth/2fa/disable.
 *
 * After either operation we call `router.refresh()` to re-render the parent
 * server component with the updated `totpEnabled` state.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface SetupData {
  qrDataUrl: string;
  manualEntryKey: string;
  setupToken: string;
}

interface Props {
  totpEnabled: boolean;
}

export function SecurityClient({ totpEnabled }: Props) {
  const router = useRouter();

  // Setup-flow state
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [code, setCode] = useState("");

  // Disable-flow state
  const [disableMode, setDisableMode] = useState(false);
  const [disableCode, setDisableCode] = useState("");

  // Shared state
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function startSetup() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
      if (!res.ok) throw new Error(`Setup failed (${res.status})`);
      const data = (await res.json()) as SetupData;
      setSetupData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function confirmSetup() {
    if (!setupData) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/2fa/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupToken: setupData.setupToken, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Confirm failed");
      // Success — clear local state and refresh server data.
      setSetupData(null);
      setCode("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function disable2fa() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: disableCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Disable failed");
      setDisableMode(false);
      setDisableCode("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <div className="mb-8 space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-accent-gold">
          Account Security
        </p>
        <h1 className="text-3xl font-bold text-foreground">
          Two-factor authentication
        </h1>
        <p className="text-sm text-foreground/70">
          Adds a second factor (a 6-digit code from your authenticator app) on
          top of your password.
        </p>
      </div>

      <div className="rounded-3xl border border-border bg-background/95 p-8">
        {totpEnabled ? (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex rounded-full bg-accent-gold/15 px-3 py-1 text-xs font-medium text-accent-gold">
                Enabled
              </span>
              <p className="text-sm text-foreground/80">
                2FA is active. You&apos;ll be asked for a code on every login.
              </p>
            </div>

            {!disableMode ? (
              <button
                type="button"
                onClick={() => setDisableMode(true)}
                className="rounded-2xl border border-border px-4 py-2 text-sm text-foreground/80 transition-colors hover:border-accent-coral hover:text-accent-hover"
              >
                Disable 2FA
              </button>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-foreground/80">
                  Enter your current 6-digit code to confirm.
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value)}
                  className="w-full max-w-xs rounded-2xl border border-border bg-background px-4 py-3 text-center text-xl tracking-[0.4em] text-foreground outline-none focus:border-accent-coral"
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={disable2fa}
                    disabled={loading || disableCode.length !== 6}
                    className="rounded-2xl bg-accent-coral px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
                  >
                    {loading ? "Disabling…" : "Confirm disable"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDisableMode(false);
                      setDisableCode("");
                      setError(null);
                    }}
                    className="rounded-2xl border border-border px-4 py-2 text-sm text-foreground/70"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex rounded-full bg-foreground/5 px-3 py-1 text-xs font-medium text-foreground/60">
                Not enabled
              </span>
              <p className="text-sm text-foreground/80">
                You&apos;re protected by password only. Enable 2FA for an extra
                layer.
              </p>
            </div>

            {!setupData ? (
              <button
                type="button"
                onClick={startSetup}
                disabled={loading}
                className="rounded-2xl bg-accent-coral px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
              >
                {loading ? "Generating…" : "Enable 2FA"}
              </button>
            ) : (
              <div className="space-y-6">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">
                    Step 1 — scan with Google Authenticator, Authy, 1Password,
                    etc.
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={setupData.qrDataUrl}
                    alt="2FA QR code"
                    className="rounded-2xl border border-border"
                  />
                  <details className="text-sm">
                    <summary className="cursor-pointer text-foreground/70 hover:text-accent-hover">
                      Can&apos;t scan? Enter manually
                    </summary>
                    <code className="mt-2 block break-all rounded-xl bg-foreground/5 px-3 py-2 text-xs text-foreground/80">
                      {setupData.manualEntryKey}
                    </code>
                  </details>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">
                    Step 2 — enter the 6-digit code your app shows
                  </p>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full max-w-xs rounded-2xl border border-border bg-background px-4 py-3 text-center text-xl tracking-[0.4em] text-foreground outline-none focus:border-accent-coral"
                  />
                  <button
                    type="button"
                    onClick={confirmSetup}
                    disabled={loading || code.length !== 6}
                    className="rounded-2xl bg-accent-coral px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
                  >
                    {loading ? "Verifying…" : "Confirm"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {error ? (
          <p className="mt-6 rounded-2xl border border-accent-coral/30 bg-accent-coral/10 px-4 py-3 text-sm text-accent-coral">
            {error}
          </p>
        ) : null}
      </div>

      <Link
        href="/admin"
        className="mt-8 inline-block rounded-2xl border border-border px-4 py-2 text-sm text-foreground/80 transition-colors hover:border-accent-coral hover:text-accent-hover"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
