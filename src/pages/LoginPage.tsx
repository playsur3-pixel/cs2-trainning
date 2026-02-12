import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card";
import { setSession } from "../lib/auth";
import { apiLogin } from "../lib/api";

function safeToken() {
  // lightweight client token (server auth will replace this later)
  const a = Math.random().toString(36).slice(2);
  const b = Math.random().toString(36).slice(2);
  return `${a}${b}`;
}

export function LoginPage() {
  const nav = useNavigate();
  const [pseudo, setPseudo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(
    () => pseudo.trim().length >= 2 && password.trim().length >= 6,
    [pseudo, password]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!canSubmit) return;

    setLoading(true);
    try {
      // Netlify Functions: POST /.netlify/functions/login
      const s = await apiLogin(pseudo.trim(), password.trim());
      setSession(s);
      nav("/player", { replace: true });
    } catch (err) {
      // Dev fallback: allow local mock session if functions are not available.
      // Remove this block if you want a strict server-only auth.
      const message = err instanceof Error ? err.message : "";
      if (message.toLowerCase().includes("failed to fetch") || message.toLowerCase().includes("network")) {
        setSession({ pseudo: pseudo.trim(), token: safeToken() });
        nav("/player", { replace: true });
        return;
      }
      setError("Connexion impossible. Vérifie le pseudo / password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <section className="relative overflow-hidden rounded-xl2 border border-border/50 shadow-soft">
        {/* Background */}
        <div
          className="relative min-h-[72vh] bg-[url('/assets/BG_Title.png')] bg-cover bg-center"
          aria-label="CS2 background"
        >
          {/* Dark overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-bg/55 via-bg/40 to-bg/70" />

          {/* Login card (compact so it doesn't hide the bottom title) */}
          <div className="relative flex min-h-[90vh] items-start justify-center px-4 pt-[210px]">
            <div className="w-full max-w-sm">
              <Card className="bg-card/55">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl">Connexion</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <form onSubmit={onSubmit} className="grid gap-3">
                    <label className="grid gap-1">
                      <span className="text-xs text-muted">Pseudo</span>
                      <input
                        value={pseudo}
                        onChange={(e) => setPseudo(e.target.value)}
                        className="rounded-xl2 border border-border/60 bg-bg/40 px-3 py-2 text-sm outline-none focus:border-cs2/70"
                        placeholder=""
                        autoComplete="username"
                      />
                    </label>

                    <label className="grid gap-1">
                      <span className="text-xs text-muted">Password</span>
                      <input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        type="password"
                        className="rounded-xl2 border border-border/60 bg-bg/40 px-3 py-2 text-sm outline-none focus:border-cs2/70"
                        placeholder=""
                        autoComplete="current-password"
                      />
                    </label>

                    {error ? (
                      <div className="rounded-xl2 border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                        {error}
                      </div>
                    ) : null}

                    <button
                      disabled={!canSubmit || loading}
                      className="mt-2 rounded-full bg-cs2 px-4 py-2 text-sm font-semibold text-bg hover:bg-cs2b disabled:cursor-not-allowed disabled:opacity-50"
                      type="submit"
                    >
                      {loading ? "Connexion…" : "Se connecter"}
                    </button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
