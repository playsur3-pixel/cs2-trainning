import { getStore, connectLambda } from "@netlify/blobs";
import { json, readWhitelist, sha256 } from "./_util.mjs";

export async function handler(event, context) {
  connectLambda(event);

  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const secret = process.env.ADMIN_SECRET;
  if (!secret) return json(500, { error: "ADMIN_SECRET not configured" });

  const supplied =
    event.headers?.["x-admin-secret"] ||
    event.headers?.["X-Admin-Secret"] ||
    event.headers?.["x-admin-secret".toLowerCase()];

  if (String(supplied || "") !== String(secret)) {
    return json(403, { error: "Forbidden" });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const pseudo = String(body?.pseudo || "").trim();
  const password = String(body?.password || "").trim();

  if (pseudo.length < 2 || password.length < 6) {
    return json(400, { error: "pseudo >=2 and password >=6 required" });
  }

  const whitelist = readWhitelist();
  if (!whitelist.has(pseudo)) return json(403, { error: "Pseudo not whitelisted" });

  const store = getStore("psm");
  await store.set(
    `auth:${pseudo}`,
    JSON.stringify({
      pseudo,
      password_hash: sha256(password),
      updated_at: new Date().toISOString(),
    }),
    { contentType: "application/json" }
  );

  return json(200, { ok: true });
}
