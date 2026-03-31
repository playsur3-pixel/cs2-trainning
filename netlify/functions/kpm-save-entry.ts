import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

type SessionPayload = {
  pseudo: string;
  exp: number;
};

type SaveEntryBody = {
  date?: string;
  weapons?: {
    glock?: number | null;
    usp_s?: number | null;
    deagle?: number | null;
    ak47?: number | null;
    m4a4?: number | null;
    m4a1_s?: number | null;
    galil?: number | null;
  };
};

type SavedEntry = {
  pseudo: string;
  date: string;
  weapons: {
    glock: number | null;
    usp_s: number | null;
    deagle: number | null;
    ak47: number | null;
    m4a4: number | null;
    m4a1_s: number | null;
    galil: number | null;
  };
  average_kpm: number | null;
  updated_at: string;
};

const entriesStore = getStore("kpm-entries");

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}

function base64UrlDecode(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function verifySessionToken(token: string, secret: string): SessionPayload | null {
  const parts = token.split(".");

  if (parts.length !== 2) {
    return null;
  }

  const [encodedPayload, providedSignature] = parts;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload, "utf8")
    .digest("base64url");

  const providedBuf = Buffer.from(providedSignature);
  const expectedBuf = Buffer.from(expectedSignature);

  if (providedBuf.length !== expectedBuf.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(providedBuf, expectedBuf)) {
    return null;
  }

  let payload: SessionPayload;

  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;
  } catch {
    return null;
  }

  if (!payload?.pseudo || !payload?.exp) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);

  if (payload.exp < now) {
    return null;
  }

  return payload;
}

function extractBearerToken(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";

  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length).trim();
}

function isValidDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    throw new Error("Valeur numérique invalide.");
  }

  if (value < 0) {
    throw new Error("Une valeur KPM ne peut pas être négative.");
  }

  return value;
}

function computeAverage(values: Array<number | null>) {
  const valid = values.filter((v): v is number => v !== null);

  if (valid.length === 0) {
    return null;
  }

  const sum = valid.reduce((acc, current) => acc + current, 0);
  return Number((sum / valid.length).toFixed(3));
}

export default async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return json({ ok: false, message: "Méthode non autorisée." }, 405);
    }

    const secret = process.env.KPM_JWT_SECRET;

    if (!secret) {
      return json(
        { ok: false, message: "Variable KPM_JWT_SECRET manquante." },
        500
      );
    }

    const token = extractBearerToken(req);

    if (!token) {
      return json({ ok: false, message: "Token manquant." }, 401);
    }

    const session = verifySessionToken(token, secret);

    if (!session) {
      return json({ ok: false, message: "Token invalide ou expiré." }, 401);
    }

    let body: SaveEntryBody;

    try {
      body = (await req.json()) as SaveEntryBody;
    } catch {
      return json({ ok: false, message: "Body JSON invalide." }, 400);
    }

    const date = (body.date ?? "").trim();

    if (!date || !isValidDateString(date)) {
      return json(
        { ok: false, message: "Date invalide. Format attendu : yyyy-MM-dd." },
        400
      );
    }

    const weaponsInput = body.weapons ?? {};

    let glock: number | null;
    let usp_s: number | null;
    let deagle: number | null;
    let ak47: number | null;
    let m4a4: number | null;
    let m4a1_s: number | null;
    let galil: number | null;

    try {
      glock = toNullableNumber(weaponsInput.glock);
      usp_s = toNullableNumber(weaponsInput.usp_s);
      deagle = toNullableNumber(weaponsInput.deagle);
      ak47 = toNullableNumber(weaponsInput.ak47);
      m4a4 = toNullableNumber(weaponsInput.m4a4);
      m4a1_s = toNullableNumber(weaponsInput.m4a1_s);
      galil = toNullableNumber(weaponsInput.galil);
    } catch (error) {
      return json(
        {
          ok: false,
          message: error instanceof Error ? error.message : "Valeur invalide.",
        },
        400
      );
    }

    const allValues = [glock, usp_s, deagle, ak47, m4a4, m4a1_s, galil];
    const hasAtLeastOneValue = allValues.some((value) => value !== null);

    if (!hasAtLeastOneValue) {
      return json(
        { ok: false, message: "Au moins une arme doit être renseignée." },
        400
      );
    }

    const average_kpm = computeAverage(allValues);

    const entry: SavedEntry = {
      pseudo: session.pseudo,
      date,
      weapons: {
        glock,
        usp_s,
        deagle,
        ak47,
        m4a4,
        m4a1_s,
        galil,
      },
      average_kpm,
      updated_at: new Date().toISOString(),
    };

    const key = `entry:${session.pseudo}:${date}`;

    await entriesStore.setJSON(key, entry);

    return json({
      ok: true,
      message: "Entrée enregistrée avec succès.",
      entry,
    });
  } catch (error) {
    console.error("kpm-save-entry error:", error);
    return json({ ok: false, message: "Erreur serveur." }, 500);
  }
};