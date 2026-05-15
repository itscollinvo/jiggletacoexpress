import { requireCurrentUser } from "@/lib/auth/auth";
import { SecurityClient } from "./security-client";

export const dynamic = "force-dynamic";

export default async function AdminSecurityPage() {
  const user = await requireCurrentUser();
  return <SecurityClient totpEnabled={!!user.totpSecret} />;
}
