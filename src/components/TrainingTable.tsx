import { useMemo } from "react";
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
  // YYYY-MM-DD -> DD/MM
  const [y, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function parseFRFloat(v: string) {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

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

  const dayCols = useMemo(() => [...last10Days, today], [last10Days, today]);

  const byDay = useMemo(() => {
    const map = new Map<string, Entry>();
    for (const e of entries) map.set(e.date, e);
    return map;
  }, [entries]);

  const todayEntry: Entry = todayDraft;

  const isEditing = byDay.has(today);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-card/70 px-3 py-3 text-left text-xs font-semibold text-muted">
              Jour
            </th>
            {dayCols.map((iso) => (
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
            {dayCols.map((iso) => {
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
                    onChange={(ev) => onChangeToday({ ...todayEntry, weapon: ev.target.value as any })}
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
            {dayCols.map((iso) => {
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
                      onChangeToday({ ...todayEntry, kpm_immobile: parseFRFloat(ev.target.value) })
                    }
                    className="w-full rounded-xl2 border border-border/60 bg-bg/40 px-2 py-2 text-sm outline-none focus:border-cs2/70"
                    placeholder="ex: 1,25"
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
            {dayCols.map((iso) => {
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
                    onChange={(ev) => onChangeToday({ ...todayEntry, kpm_cs: parseFRFloat(ev.target.value) })}
                    className="w-full rounded-xl2 border border-border/60 bg-bg/40 px-2 py-2 text-sm outline-none focus:border-cs2/70"
                    placeholder="ex: 1,60"
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
  );
}
