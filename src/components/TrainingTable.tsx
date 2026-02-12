import { useEffect, useMemo, useState } from "react";
import { cn } from "../lib/cn";

export type WeaponKey = "glock" | "usp_s" | "m4a4" | "m4a1_s" | "ak47" | "galil";

export type Entry = {
  date: string; // YYYY-MM-DD
  weapon: WeaponKey;
  kpm_immobile: number | null;
  kpm_cs: number | null;
};

export const WEAPONS: { key: WeaponKey; label: string }[] = [
  { key: "glock", label: "Glock" },
  { key: "usp_s", label: "USP-S" },
  { key: "m4a4", label: "M4A4" },
  { key: "m4a1_s", label: "M4A1-S" },
  { key: "ak47", label: "AK-47" },
  { key: "galil", label: "Galil" },
];

function isoDay(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function shortDay(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function parseFRFloat(v: string) {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/**
 * TrainingTable = TAB 1 (editable) + TAB 2 (read-only) + GRAPH
 * Ordre: TAB1 -> TAB2 -> GRAPH
 */
export function TrainingTable({
  entries,
  todayDraft,
  onChangeToday,
  onSave,
}: {
  entries: Entry[];
  todayDraft: Entry;
  onChangeToday: (next: Entry) => void;
  onSave: () => void;
}) {
  const today = useMemo(() => isoDay(new Date()), []);

  // TAB 1 : J-10 ... J-1 + aujourd'hui
  const last10Days = useMemo(() => {
    const res: string[] = [];
    const d = new Date();
    for (let i = 10; i >= 1; i--) {
      const tmp = new Date(d);
      tmp.setDate(d.getDate() - i);
      res.push(isoDay(tmp));
    }
    return res;
  }, []);

  const tab1Cols = useMemo(() => [...last10Days, today], [last10Days, today]);

  // TAB 2 : J-20 ... J-11 (10 jours avant TAB 1)
  const tab2Cols = useMemo(() => {
    const res: string[] = [];
    const base = new Date();
    // J-20 -> J-11 inclus
    for (let i = 20; i >= 11; i--) {
      const tmp = new Date(base);
      tmp.setDate(base.getDate() - i);
      res.push(isoDay(tmp));
    }
    return res;
  }, []);

  const byDay = useMemo(() => {
    const map = new Map<string, Entry>();
    for (const e of entries) map.set(e.date, e);
    return map;
  }, [entries]);

  const todayEntry: Entry = todayDraft;
  const isEditing = byDay.has(today);

  return (
    <div className="grid gap-8">
      {/* ========================= TAB 1 ========================= */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-card/70 px-3 py-3 text-left text-xs font-semibold text-muted">
                Jour
              </th>
              {tab1Cols.map((iso) => (
                <th
                  key={iso}
                  className={cn(
                    "px-3 py-3 text-left text-xs font-semibold",
                    iso === today ? "text-text" : "text-muted"
                  )}
                >
                  {shortDay(iso)}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* Row: Weapon */}
            <tr className="border-t border-border/40">
              <td className="sticky left-0 z-10 bg-card/70 px-3 py-3 text-xs text-muted">
                Arme
              </td>
              {tab1Cols.map((iso) => {
                const e = byDay.get(iso);
                const isToday = iso === today;

                if (!isToday) {
                  return (
                    <td key={iso} className="px-3 py-3">
                      {e ? WEAPONS.find((w) => w.key === e.weapon)?.label ?? "—" : "—"}
                    </td>
                  );
                }

                return (
                  <td key={iso} className="px-3 py-3">
                    <select
                      value={todayEntry.weapon}
                      onChange={(ev) =>
                        onChangeToday({ ...todayEntry, weapon: ev.target.value as WeaponKey })
                      }
                      className="w-full rounded-xl2 border border-border/60 bg-bg/40 px-2 py-2 text-sm outline-none focus:border-cs2/70"
                    >
                      {WEAPONS.map((w) => (
                        <option key={w.key} value={w.key}>
                          {w.label}
                        </option>
                      ))}
                    </select>
                  </td>
                );
              })}
            </tr>

            {/* Row: KPM immobile */}
            <tr className="border-t border-border/40">
              <td className="sticky left-0 z-10 bg-card/70 px-3 py-3 text-xs text-muted">
                KPM immobile
              </td>
              {tab1Cols.map((iso) => {
                const e = byDay.get(iso);
                const isToday = iso === today;

                if (!isToday) {
                  return (
                    <td key={iso} className="px-3 py-3">
                      {typeof e?.kpm_immobile === "number" ? e.kpm_immobile.toFixed(2) : "—"}
                    </td>
                  );
                }

                return (
                  <td key={iso} className="px-3 py-3">
                    <input
                      inputMode="decimal"
                      value={todayEntry.kpm_immobile ?? ""}
                      onChange={(ev) =>
                        onChangeToday({
                          ...todayEntry,
                          kpm_immobile: parseFRFloat(ev.target.value),
                        })
                      }
                      className="w-full rounded-xl2 border border-border/60 bg-bg/40 px-2 py-2 text-sm outline-none focus:border-cs2/70"
                    />
                  </td>
                );
              })}
            </tr>

            {/* Row: KPM CS */}
            <tr className="border-t border-border/40">
              <td className="sticky left-0 z-10 bg-card/70 px-3 py-3 text-xs text-muted">
                KPM CS
              </td>
              {tab1Cols.map((iso) => {
                const e = byDay.get(iso);
                const isToday = iso === today;

                if (!isToday) {
                  return (
                    <td key={iso} className="px-3 py-3">
                      {typeof e?.kpm_cs === "number" ? e.kpm_cs.toFixed(2) : "—"}
                    </td>
                  );
                }

                return (
                  <td key={iso} className="px-3 py-3">
                    <input
                      inputMode="decimal"
                      value={todayEntry.kpm_cs ?? ""}
                      onChange={(ev) =>
                        onChangeToday({
                          ...todayEntry,
                          kpm_cs: parseFRFloat(ev.target.value),
                        })
                      }
                      className="w-full rounded-xl2 border border-border/60 bg-bg/40 px-2 py-2 text-sm outline-none focus:border-cs2/70"
                    />
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-muted">
            {isEditing
              ? "Une entrée existe déjà aujourd’hui — tu peux la modifier."
              : "Aucune entrée aujourd’hui — remplis la dernière colonne et enregistre."}
          </div>
          <button
            onClick={onSave}
            className="rounded-full bg-cs2 px-4 py-2 text-sm font-semibold text-bg hover:bg-cs2b"
          >
            {isEditing ? "Modifier" : "Enregistrer"}
          </button>
        </div>
      </div>

      {/* ========================= TAB 2 ========================= */}
      <TrainingHistoryTable entries={entries} dayCols={tab2Cols} />

      {/* ========================= GRAPH ========================= */}
      <KpmChart entries={entries} daysBack={20} defaultWeapon={todayEntry.weapon} />
    </div>
  );
}

/** TAB 2 = lecture seule sur des colonnes déjà calculées */
function TrainingHistoryTable({
  entries,
  dayCols,
}: {
  entries: Entry[];
  dayCols: string[];
}) {
  const byDay = useMemo(() => {
    const map = new Map<string, Entry>();
    for (const e of entries) map.set(e.date, e);
    return map;
  }, [entries]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-card/70 px-3 py-3 text-left text-xs font-semibold text-muted">
              Jour
            </th>
            {dayCols.map((iso) => (
              <th key={iso} className="px-3 py-3 text-left text-xs font-semibold text-muted">
                {shortDay(iso)}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          <tr className="border-t border-border/40">
            <td className="sticky left-0 z-10 bg-card/70 px-3 py-3 text-xs text-muted">Arme</td>
            {dayCols.map((iso) => {
              const e = byDay.get(iso);
              return (
                <td key={iso} className="px-3 py-3">
                  {e ? WEAPONS.find((w) => w.key === e.weapon)?.label ?? "—" : "—"}
                </td>
              );
            })}
          </tr>

          <tr className="border-t border-border/40">
            <td className="sticky left-0 z-10 bg-card/70 px-3 py-3 text-xs text-muted">
              KPM immobile
            </td>
            {dayCols.map((iso) => {
              const e = byDay.get(iso);
              return (
                <td key={iso} className="px-3 py-3">
                  {typeof e?.kpm_immobile === "number" ? e.kpm_immobile.toFixed(2) : "—"}
                </td>
              );
            })}
          </tr>

          <tr className="border-t border-border/40">
            <td className="sticky left-0 z-10 bg-card/70 px-3 py-3 text-xs text-muted">KPM CS</td>
            {dayCols.map((iso) => {
              const e = byDay.get(iso);
              return (
                <td key={iso} className="px-3 py-3">
                  {typeof e?.kpm_cs === "number" ? e.kpm_cs.toFixed(2) : "—"}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function linePath(
  values: (number | null)[],
  xAt: (i: number) => number,
  yAt: (v: number) => number
) {
  let d = "";
  let started = false;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v == null || !Number.isFinite(v)) {
      started = false;
      continue;
    }
    const x = xAt(i);
    const y = yAt(v);
    if (!started) {
      d += `M ${x} ${y}`;
      started = true;
    } else {
      d += ` L ${x} ${y}`;
    }
  }
  return d;
}

export function KpmChart({
  entries,
  daysBack = 20,
  defaultWeapon = "glock",
}: {
  entries: Entry[];
  daysBack?: number; // ex: 20 => J-20 ... J
  defaultWeapon?: WeaponKey;
}) {
  const [weapon, setWeapon] = useState<WeaponKey>(defaultWeapon);

  // si aujourd’hui tu changes l’arme, on resynchronise le select du chart
  useEffect(() => {
    setWeapon(defaultWeapon);
  }, [defaultWeapon]);

  const days = useMemo(() => {
    const res: string[] = [];
    const base = new Date();
    for (let i = daysBack; i >= 0; i--) {
      const tmp = new Date(base);
      tmp.setDate(base.getDate() - i);
      res.push(isoDay(tmp));
    }
    return res;
  }, [daysBack]);

  const byDay = useMemo(() => {
    const map = new Map<string, Entry>();
    for (const e of entries) map.set(e.date, e);
    return map;
  }, [entries]);

  const series = useMemo(() => {
    const imm: (number | null)[] = [];
    const cs: (number | null)[] = [];

    for (const d of days) {
      const e = byDay.get(d);
      if (!e || e.weapon !== weapon) {
        imm.push(null);
        cs.push(null);
        continue;
      }
      imm.push(typeof e.kpm_immobile === "number" ? e.kpm_immobile : null);
      cs.push(typeof e.kpm_cs === "number" ? e.kpm_cs : null);
    }

    return { imm, cs };
  }, [days, byDay, weapon]);

  const range = useMemo(() => {
    const vals = [...series.imm, ...series.cs].filter((v): v is number => typeof v === "number");
    const min = vals.length ? Math.min(...vals) : 0;
    const max = vals.length ? Math.max(...vals) : 2;
    const pad = (max - min) * 0.15 || 0.25;
    return { min: Math.max(0, min - pad), max: max + pad };
  }, [series]);

  const W = 1000;
  const H = 280;
  const P = { l: 52, r: 18, t: 16, b: 40 };
  const plotW = W - P.l - P.r;
  const plotH = H - P.t - P.b;

  const xAt = (i: number) => P.l + (plotW * (days.length === 1 ? 0 : i / (days.length - 1)));
  const yAt = (v: number) => {
    const denom = range.max - range.min || 1;
    return P.t + (plotH * (range.max - v)) / denom;
  };

  const immPath = linePath(series.imm, xAt, yAt);
  const csPath = linePath(series.cs, xAt, yAt);

  return (
    <div className="rounded-xl2 border border-border/50 bg-card/40 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-text">Évolution KPM (par jour)</div>
          <div className="text-xs text-muted">2 courbes : KPM immobile + KPM CS</div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs text-muted">Arme</div>
          <select
            value={weapon}
            onChange={(e) => setWeapon(e.target.value as WeaponKey)}
            className="rounded-xl2 border border-border/60 bg-bg/40 px-3 py-2 text-sm outline-none focus:border-cs2/70"
          >
            {WEAPONS.map((w) => (
              <option key={w.key} value={w.key}>
                {w.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-[280px] w-full min-w-[860px]">
          {/* Grid lines */}
          {[0, 0.5, 1].map((t) => {
            const y = P.t + plotH * t;
            return (
              <line
                key={t}
                x1={P.l}
                y1={y}
                x2={W - P.r}
                y2={y}
                stroke="rgba(255,255,255,0.08)"
              />
            );
          })}

          {/* Y labels */}
          <text x={10} y={P.t + 6} fontSize="12" fill="rgba(255,255,255,0.55)">
            {range.max.toFixed(2)}
          </text>
          <text x={10} y={P.t + plotH + 6} fontSize="12" fill="rgba(255,255,255,0.55)">
            {range.min.toFixed(2)}
          </text>

          {/* Lines */}
          <path d={immPath} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2.2" />
          <path d={csPath} fill="none" stroke="rgba(255,153,0,0.95)" strokeWidth="2.2" />

          {/* Dots */}
          {series.imm.map((v, i) =>
            typeof v === "number" ? (
              <circle key={`i-${i}`} cx={xAt(i)} cy={yAt(v)} r="3.2" fill="rgba(255,255,255,0.9)" />
            ) : null
          )}
          {series.cs.map((v, i) =>
            typeof v === "number" ? (
              <circle key={`c-${i}`} cx={xAt(i)} cy={yAt(v)} r="3.2" fill="rgba(255,153,0,0.95)" />
            ) : null
          )}

          {/* X labels */}
          {days.map((d, i) => {
            const show = i === 0 || i === days.length - 1 || i % 3 === 0;
            if (!show) return null;
            return (
              <text
                key={d}
                x={xAt(i)}
                y={H - 14}
                fontSize="12"
                fill="rgba(255,255,255,0.55)"
                textAnchor="middle"
              >
                {shortDay(d)}
              </text>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-muted">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-6 rounded-full bg-white/80" />
          KPM immobile
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-6 rounded-full bg-[rgba(255,153,0,0.95)]" />
          KPM CS
        </div>
      </div>
    </div>
  );
}
