import { getStore, connectLambda } from "@netlify/blobs";
import { json, normalizePseudo, randomToken, readWhitelist, sha256 } from "./_util.mjs";

const SESSION_HOURS = 24;

async function readCurrentAuth(store, pseudoNormalized) {
  return await store.get(`auth:${pseudoNormalized}`, { type: "json" });
}

async function readLegacyAuth(store, pseudoInput, pseudoNormalized) {
  const candidates = [String(pseudoInput || "").trim(), pseudoNormalized].filter(Boolean);
  const uniqueCandidates = [...new Set(candidates)];

  for (const candidate of uniqueCandidates) {
    const auth = await store.get(`auth:${candidate}`, { type: "json" });
    if (auth?.password_hash) {
      return auth;
    }
  }

  return null;
}

export async function handler(event, context) {
  connectLambda(event);

  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const pseudoInput = String(body?.pseudo || "").trim();
  const password = String(body?.password || "").trim();
  const pseudoNormalized = normalizePseudo(pseudoInput);

  if (pseudoInput.length < 2 || password.length < 6) {
    return json(400, { error: "Pseudo >= 2 and password >= 6 required" });
  }

  const whitelist = readWhitelist();
  if (!whitelist.has(pseudoNormalized)) {
    return json(403, { error: "Pseudo not whitelisted" });
  }

  const store = getStore("psm");
  const legacyStore = getStore("auth-player");

  let auth = await readCurrentAuth(store, pseudoNormalized);
  if (!auth?.password_hash) {
    auth = await readLegacyAuth(legacyStore, pseudoInput, pseudoNormalized);
  }

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
  const pseudo = String(auth?.pseudo || pseudoInput).trim() || pseudoInput;

  // Migrate legacy auth records into the current store after a successful login.
  await store.setJSON(`auth:${pseudoNormalized}`, {
    pseudo,
    password_hash: auth.password_hash,
    updated_at: String(auth.updated_at || new Date().toISOString()),
  });

  await store.set(
    `session:${token}`,
    JSON.stringify({ pseudo, pseudo_key: pseudoNormalized, expires_at }),
    {
      contentType: "application/json",
    }
  );

  return json(200, { ok: true, token, pseudo, expires_at });
}
