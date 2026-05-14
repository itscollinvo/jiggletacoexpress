export function getSafeAdminRedirect(
  value: string | null | undefined,
  fallback = "/admin",
) {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (!value.startsWith("/admin")) return fallback;
  return value;
}
