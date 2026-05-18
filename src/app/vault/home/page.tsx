/**
 * /vault/home — the authenticated landing page.
 *
 * Placeholder shell. Phase 3 content (sticky notes, photos, journal entries)
 * will be built in here. The proxy already guarantees this page is only
 * reachable with a valid vault session cookie.
 */

export default function VaultHome() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="flex flex-col gap-3 text-center">
        <h1 className="text-2xl font-bold text-foreground">you&apos;re in.</h1>
        <p className="text-sm text-muted">
          this is the vault. content coming soon.
        </p>
      </div>
    </div>
  );
}
