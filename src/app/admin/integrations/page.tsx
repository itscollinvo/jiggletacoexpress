import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth/auth";
import { getIntegrationToken } from "@/lib/db/queries/integration-tokens";

export const dynamic = "force-dynamic";

const STATUS_MESSAGES: Record<string, { tone: "success" | "error"; text: string }> = {
  connected: { tone: "success", text: "Spotify connected." },
  disconnected: { tone: "success", text: "Spotify disconnected." },
  "error-access_denied": {
    tone: "error",
    text: "You denied access in Spotify. Try again to connect.",
  },
  "error-bad-state": {
    tone: "error",
    text: "Security check failed (bad OAuth state). Try again.",
  },
  "error-missing-params": {
    tone: "error",
    text: "Spotify redirected without the expected parameters.",
  },
  "error-no-refresh": {
    tone: "error",
    text: "Spotify didn't return a refresh token. Re-authorize and try again.",
  },
  "error-exchange-failed": {
    tone: "error",
    text: "Couldn't exchange the authorization code with Spotify. Try again.",
  },
};

type PageProps = {
  searchParams: Promise<{ spotify?: string }>;
};

export default async function AdminIntegrationsPage({ searchParams }: PageProps) {
  await requireCurrentUser();
  const spotify = await getIntegrationToken("spotify");
  const params = await searchParams;
  const status = params.spotify ? STATUS_MESSAGES[params.spotify] : undefined;

  const isConnected = !!spotify;

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-6 py-16">
      <div className="mb-8 flex items-start justify-between gap-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-accent-gold">
            Integrations
          </p>
          <h1 className="mt-3 text-3xl font-bold text-foreground">
            Connected services
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-foreground/70">
            Authorize third-party services so the public site can pull live
            data. Tokens are stored encrypted-at-rest and only used by your
            own routes.
          </p>
        </div>
        <Link
          href="/admin"
          className="rounded-2xl border border-border px-4 py-2 text-sm text-foreground/80 transition-colors hover:border-accent-coral hover:text-accent-hover"
        >
          Back to dashboard
        </Link>
      </div>

      {status ? (
        <div
          className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${
            status.tone === "success"
              ? "border-accent-gold/30 bg-accent-gold/10 text-accent-gold"
              : "border-accent-coral/30 bg-accent-coral/10 text-accent-coral"
          }`}
        >
          {status.text}
        </div>
      ) : null}

      {/* Spotify card */}
      <div className="rounded-3xl border border-border bg-background/95 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-foreground">Spotify</h2>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                  isConnected
                    ? "bg-accent-gold/15 text-accent-gold"
                    : "bg-foreground/5 text-foreground/60"
                }`}
              >
                {isConnected ? "Connected" : "Not connected"}
              </span>
            </div>
            <p className="mt-2 max-w-xl text-sm text-foreground/70">
              Powers the &quot;currently listening to&quot; card on the front
              page. Requires read access to your playback state.
            </p>

            {isConnected && spotify ? (
              <dl className="mt-4 grid gap-x-6 gap-y-2 text-xs text-foreground/60 sm:grid-cols-2">
                <div>
                  <dt className="font-medium text-foreground/80">Scopes</dt>
                  <dd className="mt-0.5 break-words">{spotify.scope}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground/80">
                    Access token expires
                  </dt>
                  <dd className="mt-0.5">
                    {spotify.expiresAt.toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground/80">Connected</dt>
                  <dd className="mt-0.5">
                    {spotify.createdAt.toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground/80">
                    Last refreshed
                  </dt>
                  <dd className="mt-0.5">
                    {spotify.updatedAt.toLocaleString()}
                  </dd>
                </div>
              </dl>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {isConnected ? (
            <>
              {/* Reconnect = same as connect; the upsert handles overwriting */}
              <form action="/api/spotify/auth/start" method="post">
                <button
                  type="submit"
                  className="rounded-2xl border border-border px-4 py-2 text-sm text-foreground/80 transition-colors hover:border-accent-coral hover:text-accent-hover"
                >
                  Reconnect
                </button>
              </form>
              <form action="/api/spotify/auth/disconnect" method="post">
                <button
                  type="submit"
                  className="rounded-2xl border border-accent-coral/30 px-4 py-2 text-sm text-accent-coral transition-colors hover:bg-accent-coral hover:text-white"
                >
                  Disconnect
                </button>
              </form>
            </>
          ) : (
            <form action="/api/spotify/auth/start" method="post">
              <button
                type="submit"
                className="rounded-2xl bg-accent-coral px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover"
              >
                Connect Spotify
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
