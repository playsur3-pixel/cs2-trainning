import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card";
import { TrainingTable, type Entry } from "../components/TrainingTable";
import { clearSession, getSession } from "../lib/auth";
import { apiGetPlayer, apiSaveEntry } from "../lib/api";
import { profile } from "../data/profile";

// Dev fallback (when not running via Netlify): localStorage storage
async function loadEntriesLocal(pseudo: string): Promise<Entry[]> {
  const key = `psm_entries_${pseudo}`;
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Entry[];
  } catch {
    return [];
  }
}

async function saveEntryLocal(pseudo: string, entry: Entry) {
  const key = `psm_entries_${pseudo}`;
  const entries = await loadEntriesLocal(pseudo);
  const next = entries.filter((e) => e.date !== entry.date);
  next.push(entry);
  next.sort((a, b) => a.date.localeCompare(b.date));
  localStorage.setItem(key, JSON.stringify(next));
}

export function DashboardPage() {
  const nav = useNavigate();
  const session = useMemo(() => getSession(), []);
  const pseudo = session?.pseudo ?? "";

  const [entries, setEntries] = useState<Entry[]>([]);
  const [todayDraft, setTodayDraft] = useState<Entry | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const todayIso = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;
  }, []);

  useEffect(() => {
    if (!session) {
      nav("/", { replace: true });
      return;
    }
    (async () => {
      let data: Entry[] = [];
      try {
        const r = await apiGetPlayer(session);
        data = Array.isArray(r.entries) ? r.entries : [];
      } catch {
        // Dev fallback when Netlify Functions are not available
        data = await loadEntriesLocal(session.pseudo);
      }
      setEntries(data);
      // Prepare today's draft so the button can work immediately
      const existingToday = data.find((e) => e.date === todayIso) ?? {
        date: todayIso,
        weapon: "glock" as const,
        kpm_immobile: null,
        kpm_cs: null,
      };
      setTodayDraft(existingToday);
    })();
  }, [session, nav, todayIso]);

  async function onSave() {
    if (!session) return;
    if (!todayDraft) {
      setStatus("Remplis la dernière colonne avant d'enregistrer.");
      return;
    }
    try {
      await apiSaveEntry(session, todayDraft);
      const r = await apiGetPlayer(session);
      setEntries(Array.isArray(r.entries) ? r.entries : []);
    } catch {
      // Dev fallback
      await saveEntryLocal(session.pseudo, todayDraft);
      const next = await loadEntriesLocal(session.pseudo);
      setEntries(next);
    }
    setStatus("Enregistré ✅");
    setTimeout(() => setStatus(null), 2000);
  }

  function logout() {
    clearSession();
    nav("/", { replace: true });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* Bloc de présentation (full width) */}
      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="relative">
              <img
                src={profile.avatar}
                alt={pseudo}
                className="h-16 w-16 rounded-2xl border border-border/50 object-cover"
              />
              <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-card bg-cs2" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold">{pseudo}</div>
              <div className="truncate text-sm text-muted">Suivi d'entraînement (KPM)</div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={logout}
              className="rounded-full border border-border/60 bg-card/40 px-4 py-2 text-sm font-semibold hover:border-cs2/60"
            >
              Déconnexion
            </button>
          </div>
        </div>

        <p className="mt-4 text-sm text-muted">{profile.about}</p>
      </Card>

      {/* Encart stats */}
      <section className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Statistiques — 10 derniers jours + aujourd’hui</CardTitle>
            <div className="text-sm text-muted">
              Saisie du jour dans la dernière colonne : Arme + KPM immobile + KPM CS.
            </div>
          </CardHeader>
          <CardContent>
            {status ? (
              <div className="mb-4 rounded-xl2 border border-border/60 bg-bg/40 px-3 py-2 text-sm">
                {status}
              </div>
            ) : null}

            <TrainingTable
              entries={entries}
              todayDraft={
                todayDraft ?? {
                  date: todayIso,
                  weapon: "glock",
                  kpm_immobile: null,
                  kpm_cs: null,
                }
              }
              onChangeToday={(next) => setTodayDraft(next)}
              onSave={onSave}
            />
          </CardContent>
        </Card>
      </section>

      {/* Historique plus ancien */}
      <section className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Historique — 10 jours précédents</CardTitle>
            <div className="text-sm text-muted">
              Les 10 jours avant le tableau principal (lecture seule).
            </div>
          </CardHeader>
          <CardContent>
            <TrainingHistoryTable entries={entries} daysAgoFrom={20} days={10} />
          </CardContent>
        </Card>
      </section>

      <footer className="mt-12 border-t border-border/40 py-8 text-center text-xs text-muted">
        © {new Date().getFullYear()} playSURE — Monitoring
      </footer>
    </main>
  );
}
