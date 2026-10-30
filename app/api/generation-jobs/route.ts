import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/server";
import { getDb } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  try {
    const user = await requireSession();
    if (!user) {
      return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
    }

    const appUserId = await getOrCreateAppUser(user);
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");
    const rawLimit = Number(url.searchParams.get("limit") ?? 25);
    const limit = Number.isFinite(rawLimit) ? Math.min(100, Math.max(1, Math.floor(rawLimit))) : 25;

    if (projectId && !UUID.test(projectId)) {
      return NextResponse.json({ error: "A valid project ID is required." }, { status: 400 });
    }

    const sql = getDb();
    let jobs;
    if (projectId) {
      // Ownership is enforced in the query itself; a caller cannot enumerate another
      // user's jobs by supplying a project identifier.
      jobs = await sql`
        SELECT
          id, project_id AS "projectId", job_type AS "jobType",
          provider, model, status, progress, parameters->>'purpose' AS purpose, parameters->'result' AS result,
          error_code AS "errorCode", error_message AS "errorMessage",
          estimated_cost_usd AS "estimatedCostUsd", actual_cost_usd AS "actualCostUsd",
          started_at AS "startedAt", completed_at AS "completedAt",
          created_at AS "createdAt", updated_at AS "updatedAt"
        FROM generation_jobs
        WHERE user_id = ${appUserId} AND project_id = ${projectId}::uuid
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    } else {
      jobs = await sql`
        SELECT
          id, project_id AS "projectId", job_type AS "jobType",
          provider, model, status, progress,
          error_code AS "errorCode", error_message AS "errorMessage",
          estimated_cost_usd AS "estimatedCostUsd", actual_cost_usd AS "actualCostUsd",
          started_at AS "startedAt", completed_at AS "completedAt",
          created_at AS "createdAt", updated_at AS "updatedAt"
        FROM generation_jobs
        WHERE user_id = ${appUserId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    }

    return NextResponse.json({ jobs, limit, count: jobs.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load generation history.";
    const unavailable = message.toLowerCase().includes("not configured");
    return NextResponse.json(
      { error: unavailable ? message : "Could not load generation history." },
      { status: unavailable ? 503 : 500 },
    );
  }
}
