import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const route = await readFile(new URL("../app/api/capabilities/route.ts", import.meta.url), "utf8");
const storyboardRoute = await readFile(new URL("../app/api/agents/storyboard/route.ts", import.meta.url), "utf8");
const sceneRoute = await readFile(new URL("../app/api/projects/[id]/scenes/route.ts", import.meta.url), "utf8");
const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
const generationJobsRoute = await readFile(new URL("../app/api/generation-jobs/route.ts", import.meta.url), "utf8");
const generationJobsPage = await readFile(new URL("../app/studio/jobs/page.tsx", import.meta.url), "utf8");

assert.equal(packageJson.private, true, "The application should remain private to its owner.");
assert.ok(packageJson.dependencies.next, "Next.js must be installed.");
assert.match(route, /export async function GET\(\)/, "Capabilities endpoint must export GET.");
assert.match(route, /credentialsExposed: false/, "Endpoint must explicitly assert it does not expose credentials.");
assert.match(route, /providerCallsMade: false/, "Capabilities check must not call providers.");
assert.match(route, /adapter_pending/, "Image/video generation must remain disabled until adapters exist.");
assert.match(storyboardRoute, /internalReason/, "Provider diagnostics must be retained only for server-side troubleshooting.");
assert.match(storyboardRoute, /internal provider and server details are not exposed to the browser/, "Unexpected storyboard failures must return a redacted public error.");
assert.doesNotMatch(storyboardRoute, /NextResponse\.json\(\{ error: safeReason/, "Raw provider errors must not be returned to the browser.");
assert.doesNotMatch(storyboardRoute, /\.join\("\\\\n"\)/, "Reviewer prompt lines must use actual newline separators.");
assert.match(sceneRoute, /Scene duration must be greater than 0 and at most 30 seconds/, "Scene duration validation must state the actual accepted range.");
assert.match(readme, /development branch/i, "Setup documentation must direct developers to the Neon development branch.");
assert.match(generationJobsRoute, /WHERE user_id = \$\{appUserId\}/, "Generation history must scope every query to the authenticated application user.");
assert.match(generationJobsRoute, /project_id = \$\{projectId\}::uuid/, "Project-filtered generation history must include the project filter.");
assert.match(generationJobsRoute, /Math\.min\(100, Math\.max\(1, Math\.floor\(rawLimit\)\)\)/, "Generation history limits must remain bounded between 1 and 100.");
assert.match(generationJobsRoute, /export async function GET\(request: Request\)/, "Generation history must remain read-only.");
assert.match(generationJobsPage, /\/api\/generation-jobs\?limit=100/, "Generation history workspace must consume the owner-scoped API.");
assert.match(generationJobsPage, /No generation jobs yet/, "Generation history must provide an empty state.");
assert.match(generationJobsPage, /Try again/, "Generation history must provide an error recovery action.");

console.log("Foundation contract checks passed.");
