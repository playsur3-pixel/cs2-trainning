import type { Handler } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

type UserRecord = {
  pseudo?: string;
  username?: string;
  passwordHash?: string;
  createdAt?: string;
  updatedAt?: string;
  entries?: unknown[];
};

function json(statusCode: number, body: Record<string, unknown>) {
  return {
    statusCode,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  };
}

export const handler: Handler = async (event) => {
  try {
    const adminSecret =
      event.headers["x-admin-secret"] || event.headers["X-Admin-Secret"];

    if (!process.env.ADMIN_SECRET || adminSecret !== process.env.ADMIN_SECRET) {
      return json(403, { ok: false, error: "Forbidden" });
    }

    const body = JSON.parse(event.body || "{}");
    const pseudo = String(body.pseudo || "")
      .trim()
      .toLowerCase();

    if (!pseudo) {
      return json(400, { ok: false, error: "Pseudo manquant" });
    }

    const store = getStore("users");
    const key = `by-username/${pseudo}.json`;

    const user = (await store.get(key, {
    type: "json",
    consistency: "strong",
    })) as UserRecord | null;

    if (!user) {
      return json(404, { ok: false, error: "Utilisateur introuvable" });
    }

    user.entries = [];
    user.updatedAt = new Date().toISOString();

    await store.setJSON(key, user);

    return json(200, {
      ok: true,
      message: `Entries réinitialisées pour ${pseudo}`,
      key,
    });
  } catch (error) {
    return json(500, {
      ok: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
};