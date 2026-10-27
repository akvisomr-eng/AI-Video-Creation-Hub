import { getDb } from "@/lib/db";

type AuthUser = { id: string; email?: string | null; name?: string | null };

export async function getOrCreateAppUser(user: AuthUser): Promise<string> {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO app_users (auth_subject, email, display_name)
    VALUES (${user.id}, ${user.email ?? null}, ${user.name ?? null})
    ON CONFLICT (auth_subject)
    DO UPDATE SET
      email = EXCLUDED.email,
      display_name = EXCLUDED.display_name,
      updated_at = now()
    RETURNING id
  `;
  if (!rows[0]?.id) throw new Error("Could not map authenticated user to app_users.");
  return String(rows[0].id);
}
