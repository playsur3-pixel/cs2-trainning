import crypto from "crypto";
import fs from "fs";
import path from "path";

export function json(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...headers,
    },
    body: JSON.stringify(body),
  };
}

export function sha256(input) {
  return crypto.createHash("sha256").update(String(input)).digest("hex");
}

export function randomToken() {
  return crypto.randomBytes(24).toString("hex");
}

export function readWhitelist() {
  // Works both locally and on Netlify
  const p = path.resolve(process.cwd(), "public", "players.json");
  const raw = fs.readFileSync(p, "utf-8");
  const parsed = JSON.parse(raw);
  const players = Array.isArray(parsed?.players) ? parsed.players : [];
  return new Set(players.map((x) => String(x)));
}

export function bearerToken(event) {
  const h = event.headers?.authorization || event.headers?.Authorization;
  if (!h) return null;
  const m = String(h).match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}
