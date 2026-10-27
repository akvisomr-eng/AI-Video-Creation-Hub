import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const route = await readFile(new URL("../app/api/capabilities/route.ts", import.meta.url), "utf8");
const storyboardRoute = await readFile(new URL("../app/api/agents/storyboard/route.ts", import.meta.url), "utf8");
const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");

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
assert.match(readme, /development branch/i, "Setup documentation must direct developers to the Neon development branch.");

console.log("Foundation contract checks passed.");
