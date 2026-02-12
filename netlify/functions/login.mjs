import { getStore } from "@netlify/blobs";
import { json, randomToken, readWhitelist, sha256 } from "./_util.mjs";

// POST { pseudo, password } -> { ok, token, pseudo }
//
// pseudo must be in public/players.json
// password is stored as a SHA-256 hash in Blobs (key: auth:<pseudo>)
// Session token is stored in Blobs (key: session:<token>) with a short TTL (soft TTL).

const SESSION_HOURS = 24;

export async function handler(event) {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const pseudo = String(body?.pseudo || "").trim();
  const password = String(body?.password || "").trim();
  if (pseudo.length < 2 || password.length < 6) {
    return json(400, { error: "Pseudo >= 2 and password >= 6 required" });
  }

  const whitelist = readWhitelist();
  if (!whitelist.has(pseudo)) return json(403, { error: "Pseudo not whitelisted" });

  const store = getStore("psm");
  const auth = await store.get(`auth:${pseudo}`, { type: "json" });
  if (!auth?.password_hash) {
    return json(403, {
      error: "Password not initialized for this pseudo. Use admin_init_player first.",
    });
  }

  if (sha256(password) !== auth.password_hash) {
    return json(403, { error: "Invalid credentials" });
  }

  const token = randomToken();
  const expires_at = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000).toISOString();
  await store.set(
    `session:${token}`,
    JSON.stringify({ pseudo, expires_at }),
    { contentType: "application/json" }
  );

  return json(200, { ok: true, token, pseudo, expires_at });
}
