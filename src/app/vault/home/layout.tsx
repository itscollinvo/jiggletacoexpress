/**
 * Vault home layout — dark canvas, no top bar.
 * The terminal component is the entire navigation layer.
 */

export default function VaultHomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% 0%, #1a0f2e 0%, #0a0a0a 70%)",
      }}
    >
      {children}
    </div>
  );
}
