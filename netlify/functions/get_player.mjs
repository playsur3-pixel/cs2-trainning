import { getStore, connectLambda } from "@netlify/blobs";
import { bearerToken, json, normalizePseudo } from "./_util.mjs";

// GET -> { pseudo, entries }
// Requires Authorization: Bearer <token>
export async function handler(event, context) {
  connectLambda(event);

  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const token = bearerToken(event);
  if (!token) return json(401, { error: "Missing bearer token" });

  const store = getStore("psm");

  const session = await store.get(`session:${token}`, { type: "json" });
  if (!session?.pseudo || !session?.expires_at) return json(401, { error: "Invalid session" });
  if (Date.parse(session.expires_at) < Date.now()) return json(401, { error: "Session expired" });
  const pseudoKey = String(session?.pseudo_key || normalizePseudo(session.pseudo)).trim();
  const legacyPseudoKey = String(session.pseudo || "").trim();

  if (!pseudoKey) return json(401, { error: "Invalid session" });

  let data = await store.get(`data:${pseudoKey}`, { type: "json" });
  if (!data && legacyPseudoKey && legacyPseudoKey !== pseudoKey) {
    data = await store.get(`data:${legacyPseudoKey}`, { type: "json" });
  }

  data ||= {
    pseudo: session.pseudo,
    entries: [],
  };

  return json(200, data);
}
