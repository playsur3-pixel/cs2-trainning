export const WEAPONS = [
  "AK-47",
  "M4A4",
  "M4A1-S",
  "AWP",
  "Deagle",
  "USP-S",
  "Glock",
  "Galil"
] as const;

export type WeaponName = (typeof WEAPONS)[number];

export type DayEntry = {
  date: string;
} & Record<WeaponName, number>;

const STORAGE_KEY = "cs2_weapon_progress_90d";

export function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function createEmptyDay(date: string): DayEntry {
  return {
    date,
    "AK-47": 0,
    "M4A4": 0,
    "M4A1-S": 0,
    "AWP": 0,
    "Deagle": 0,
    "USP-S": 0,
    "Glock": 0,
    "Galil": 0,
  };
}

export function loadData(): DayEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveData(rows: DayEntry[]) {
  const sorted = rows
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-90); // ← 90 jours max

  localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
}

export function saveToday(values: Record<WeaponName, number>) {
  const rows = loadData();
  const today = getToday();

  const existing = rows.find(r => r.date === today);

  if (existing) {
    Object.assign(existing, values);
  } else {
    rows.push({
      date: today,
      ...values,
    });
  }

  saveData(rows);
}