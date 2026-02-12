export type Session = {
  pseudo: string;
  token: string; // opaque token (for now stored in localStorage)
};

const KEY = "psm_session";

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    if (!s?.pseudo || !s?.token) return null;
    return s;
  } catch {
    return null;
  }
}

export function setSession(session: Session) {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(KEY);
}
