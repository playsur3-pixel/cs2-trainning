import { getStore, connectLambda } from "@netlify/blobs";
import { bearerToken, json } from "./_util.mjs";

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

  const data =
    (await store.get(`data:${session.pseudo}`, { type: "json" })) || ({
      pseudo: session.pseudo,
      entries: [],
    });

  return json(200, data);
}
