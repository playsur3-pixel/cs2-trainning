import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card";
import { clearSession, getSession } from "../lib/auth";
import {
  apiGetPlayer,
  apiSaveEntry,
  type Entry,
  type WeaponKey,
} from "../lib/api";
import { profile } from "../data/profile";

type DayDraft = {
  date: string;
  values: Record<WeaponKey, number | null>;
};

type FilterValue = "all" | WeaponKey;

type ExportRow = {
  date: string;
  weapon: WeaponKey;
  weaponLabel: string;
  kpm: number | null;
};

const WEAPONS: { key: WeaponKey; label: string }[] = [
  { key: "glock", label: "Glock" },
  { key: "ups_s", label: "USP-S" },
  { key: "deagle", label: "Deagle" },
  { key: "ak47", label: "AK-47" },
  { key: "m4a4", label: "M4A4" },
  { key: "m4a1s", label: "M4A1-S" },
  { key: "galil", label: "Galil" },
];

function buildEmptyDraft(date: string): DayDraft {
  return {
    date,
    values: {
      glock: null,
      ups_s: null,
      deagle: null,
      ak47: null,
      m4a4: null,
      m4a1s: null,
      galil: null,
    },
  };
}

function clampLast90Days(entries: Entry[]): Entry[] {
  const dates = Array.from(new Set(entries.map((e) => e.date))).sort((a, b) =>
    a.localeCompare(b),
  );
  const keepDates = new Set(dates.slice(-90));
  return entries.filter((e) => keepDates.has(e.date));
}

async function loadEntriesLocal(pseudo: string): Promise<Entry[]> {
  const key = `psm_entries_${pseudo}`;
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Entry[];
    return clampLast90Days(Array.isArray(parsed) ? parsed : []);
  } catch {
    return [];
  }
}

async function saveEntriesLocal(pseudo: string, nextEntries: Entry[]) {
  const key = `psm_entries_${pseudo}`;
  localStorage.setItem(key, JSON.stringify(clampLast90Days(nextEntries)));
}

function entriesToDayDraft(entries: Entry[], date: string): DayDraft {
  const draft = buildEmptyDraft(date);

  for (const entry of entries) {
    if (entry.date !== date) continue;
    draft.values[entry.weapon] = entry.kpm;
  }

  return draft;
}

function upsertEntriesFromDraft(entries: Entry[], draft: DayDraft): Entry[] {
  const filtered = entries.filter((e) => e.date !== draft.date);

  const additions: Entry[] = WEAPONS.map(({ key }) => ({
    date: draft.date,
    weapon: key,
    kpm: draft.values[key],
  }));

  return clampLast90Days(
    [...filtered, ...additions].sort((a, b) =>
      a.date === b.date
        ? a.weapon.localeCompare(b.weapon)
        : a.date.localeCompare(b.date),
    ),
  );
}

function formatGraphDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return dateStr;
  }

  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function getLast7DaysStatus(entries: Entry[], todayIso: string) {
  const entryDates = new Set(entries.map((e) => e.date));

  const [year, month, day] = todayIso.split("-").map(Number);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return [];
  }

  const today = new Date(year, month - 1, day);
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - index));

    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;

    return {
      date: iso,
      label: `J-${6 - index}`,
      hasEntry: entryDates.has(iso),
    };
  });
}

function getDailyGraphData(entries: Entry[], weaponFilter: FilterValue) {
  const byDate = new Map<string, Entry[]>();

  for (const entry of clampLast90Days(entries)) {
    if (!byDate.has(entry.date)) byDate.set(entry.date, []);
    byDate.get(entry.date)!.push(entry);
  }

  return Array.from(byDate.keys())
    .sort((a, b) => a.localeCompare(b))
    .map((date) => {
      const dayEntries = byDate.get(date)!;
      let values: number[] = [];

      if (weaponFilter === "all") {
        values = dayEntries
          .map((entry) => entry.kpm)
          .filter((v): v is number => typeof v === "number");
      } else {
        const weaponEntry = dayEntries.find(
          (entry) => entry.weapon === weaponFilter,
        );
        values = typeof weaponEntry?.kpm === "number" ? [weaponEntry.kpm] : [];
      }

      const avg = values.length
        ? values.reduce((sum, v) => sum + v, 0) / values.length
        : 0;

      return {
        date,
        value: Number(avg.toFixed(2)),
      };
    });
}

function getProgressSummary(
  entries: Entry[],
  filter: FilterValue,
): {
  firstValue: number | null;
  lastValue: number | null;
  deltaPercent: number | null;
  recordedDays: number;
  missingDays: number;
} {
  const byDate = new Map<string, Entry[]>();

  for (const entry of clampLast90Days(entries)) {
    if (!byDate.has(entry.date)) byDate.set(entry.date, []);
    byDate.get(entry.date)!.push(entry);
  }

  const relevantDays = Array.from(byDate.keys())
    .sort((a, b) => a.localeCompare(b))
    .map((date) => {
      const dayEntries = byDate.get(date)!;
      let values: number[] = [];

      if (filter === "all") {
        values = dayEntries
          .map((entry) => entry.kpm)
          .filter((v): v is number => typeof v === "number");
      } else {
        const weaponEntry = dayEntries.find((entry) => entry.weapon === filter);
        if (typeof weaponEntry?.kpm === "number") {
          values = [weaponEntry.kpm];
        }
      }

      return values.length
        ? {
            date,
            value: Number(
              (values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(
                2,
              ),
            ),
          }
        : null;
    })
    .filter((day): day is { date: string; value: number } => day !== null);

  const recordedDays = relevantDays.length;
  const missingDays = Math.max(90 - recordedDays, 0);

  if (relevantDays.length < 2) {
    return {
      firstValue: relevantDays[0]?.value ?? null,
      lastValue: relevantDays[0]?.value ?? null,
      deltaPercent: null,
      recordedDays,
      missingDays,
    };
  }

  const firstValue = relevantDays[0].value;
  const lastValue = relevantDays[relevantDays.length - 1].value;

  const deltaPercent =
    firstValue > 0
      ? Number((((lastValue - firstValue) / firstValue) * 100).toFixed(1))
      : null;

  return {
    firstValue,
    lastValue,
    deltaPercent,
    recordedDays,
    missingDays,
  };
}

function getWeaponLabel(weapon: WeaponKey) {
  return WEAPONS.find((item) => item.key === weapon)?.label ?? weapon;
}

function getExportRows(entries: Entry[]): ExportRow[] {
  return clampLast90Days(entries)
    .slice()
    .sort((a, b) =>
      a.date === b.date
        ? a.weapon.localeCompare(b.weapon)
        : b.date.localeCompare(a.date),
    )
    .map((entry) => ({
      date: entry.date,
      weapon: entry.weapon,
      weaponLabel: getWeaponLabel(entry.weapon),
      kpm: typeof entry.kpm === "number" ? Number(entry.kpm.toFixed(2)) : null,
    }));
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function svgElementToPngDataUrl(
  svgElement: SVGSVGElement,
): Promise<string> {
  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
  clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  const viewBox = svgElement.viewBox.baseVal;
  const width = Math.max(
    Math.round(viewBox?.width || svgElement.clientWidth || 1000),
    1,
  );
  const height = Math.max(
    Math.round(viewBox?.height || svgElement.clientHeight || 420),
    1,
  );

  clonedSvg.setAttribute("width", String(width));
  clonedSvg.setAttribute("height", String(height));

  const serialized = new XMLSerializer().serializeToString(clonedSvg);
  const svgBlob = new Blob([serialized], {
    type: "image/svg+xml;charset=utf-8",
  });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImg = new Image();
      nextImg.onload = () => resolve(nextImg);
      nextImg.onerror = () =>
        reject(new Error("Impossible de convertir le graphique."));
      nextImg.src = svgUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Canvas indisponible pour l'export.");
    }

    ctx.fillStyle = "#0b1020";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function MiniLineChart({
  data,
  height = 420,
  svgRef,
}: {
  data: { date: string; value: number }[];
  height?: number;
  svgRef?: React.RefObject<SVGSVGElement>;
}) {
  const width = 1000;
  const padding = 28;

  if (!data.length) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-2xl border border-border/50 bg-bg/30 text-sm text-muted">
        Aucune donnée à afficher.
      </div>
    );
  }
  const MIN_Y = 30;
  const MAX_Y = 130;

  const minValue = MIN_Y;
  const maxValue = MAX_Y;
  const range = MAX_Y - MIN_Y; // = 100

  const points = data.map((d, index) => {
    const x =
      data.length === 1
        ? width / 2
        : padding + (index * (width - padding * 2)) / (data.length - 1);

    const y =
      height -
      padding -
      ((d.value - minValue) / range) * (height - padding * 2);

    return { x, y, ...d };
  });

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const horizontalLines = Array.from({ length: 5 }, (_, i) => {
    const ratio = i / 4;
    const y = padding + ratio * (height - padding * 2);
    const value = maxValue - ratio * range;
    return { y, value };
  });

  const shownLabels = points.filter((_, i) => {
    if (points.length <= 6) return true;
    const step = Math.ceil(points.length / 6);
    return i % step === 0 || i === points.length - 1;
  });

  return (
    <div className="overflow-x-auto">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="h-[420px] w-full min-w-[700px] rounded-2xl border border-border/50 bg-bg/20"
        role="img"
        aria-label="Graphique de progression"
      >
        {horizontalLines.map((line, idx) => (
          <g key={idx}>
            <line
              x1={padding}
              y1={line.y}
              x2={width - padding}
              y2={line.y}
              className="stroke-border/40"
              strokeWidth="1"
            />
            <text x={8} y={line.y + 4} className="fill-muted text-[11px]">
              {line.value.toFixed(1)}
            </text>
          </g>
        ))}

        <path d={path} fill="none" className="stroke-cs2" strokeWidth="3" />

        {points.map((p) => (
          <g key={`${p.date}-${p.x}`}>
            <circle cx={p.x} cy={p.y} r="4" className="fill-cs2" />
            <title>{`${formatGraphDate(p.date)} — ${p.value}`}</title>
          </g>
        ))}

        {shownLabels.map((p) => (
          <text
            key={`label-${p.date}`}
            x={p.x}
            y={height - 8}
            textAnchor="middle"
            className="fill-muted text-[11px]"
          >
            {formatGraphDate(p.date)}
          </text>
        ))}
      </svg>
    </div>
  );
}

export function DashboardPage() {
  const nav = useNavigate();
  const session = useMemo(() => getSession(), []);
  const pseudo = session?.pseudo ?? "";
  const graphSvgRef = useRef<SVGSVGElement>(null);

  const [entries, setEntries] = useState<Entry[]>([]);
  const [todayDraft, setTodayDraft] = useState<DayDraft | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterValue>("all");
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState<
    null | "json" | "xlsx" | "pdf"
  >(null);

  const todayIso = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate(),
    ).padStart(2, "0")}`;
  }, []);

  const last7DaysStatus = useMemo(
    () => getLast7DaysStatus(entries, todayIso),
    [entries, todayIso],
  );

  useEffect(() => {
    if (!session) {
      nav("/", { replace: true });
      return;
    }

    (async () => {
      let data: Entry[] = [];

      try {
        const r = await apiGetPlayer(session);
        data = Array.isArray(r.entries)
          ? clampLast90Days(r.entries as Entry[])
          : [];
      } catch {
        data = await loadEntriesLocal(session.pseudo);
      }

      setEntries(data);
      setTodayDraft(entriesToDayDraft(data, todayIso));
    })();
  }, [session, nav, todayIso]);

  async function onSave() {
    if (!session || !todayDraft) return;

    setIsSaving(true);
    setStatus(null);

    try {
      for (const { key } of WEAPONS) {
        const value = todayDraft.values[key];
        if (value === null || value === undefined) continue;

        await apiSaveEntry(session, {
          date: todayDraft.date,
          weapon: key,
          kpm: value,
        });
      }

      const optimisticNext = upsertEntriesFromDraft(entries, todayDraft);
      setEntries(optimisticNext);
      setTodayDraft(entriesToDayDraft(optimisticNext, todayIso));

      try {
        const r = await apiGetPlayer(session);
        const fresh = Array.isArray(r.entries)
          ? clampLast90Days(r.entries as Entry[])
          : [];
        setEntries(fresh);
        setTodayDraft(entriesToDayDraft(fresh, todayIso));
      } catch {
        // garde l'état optimiste
      }

      setStatus("Enregistré ✅");
    } catch (error) {
      console.error("apiSaveEntry failed:", error);

      const next = upsertEntriesFromDraft(entries, todayDraft);
      await saveEntriesLocal(session.pseudo, next);
      setEntries(next);
      setTodayDraft(entriesToDayDraft(next, todayIso));
      setStatus("Enregistré en local ✅");
    } finally {
      setIsSaving(false);
      window.setTimeout(() => setStatus(null), 2000);
    }
  }

  function logout() {
    clearSession();
    nav("/", { replace: true });
  }

  const graphData = useMemo(
    () => getDailyGraphData(entries, filter),
    [entries, filter],
  );

  const progressSummary = useMemo(
    () => getProgressSummary(entries, filter),
    [entries, filter],
  );

  const exportRows = useMemo(() => getExportRows(entries), [entries]);

  async function handleExportJson() {
    setIsExporting("json");
    try {
      const payload = {
        pseudo,
        exportedAt: new Date().toISOString(),
        filter,
        entries: exportRows,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json;charset=utf-8",
      });

      downloadBlob(blob, `playsure-kpm-${pseudo || "player"}-${todayIso}.json`);
      setStatus("Export JSON téléchargé ✅");
    } catch (error) {
      console.error(error);
      setStatus("Export JSON impossible ❌");
    } finally {
      setIsExporting(null);
      window.setTimeout(() => setStatus(null), 2500);
    }
  }

  async function handleExportXlsx() {
    setIsExporting("xlsx");
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "ChatGPT";
      workbook.created = new Date();
      workbook.modified = new Date();

      const summarySheet = workbook.addWorksheet("Progression", {
        views: [{ showGridLines: false }],
      });

      summarySheet.columns = [
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
      ];

      summarySheet.mergeCells("A1:F1");
      summarySheet.getCell("A1").value = `playSURE KPM — ${pseudo || "Joueur"}`;
      summarySheet.getCell("A1").font = { bold: true, size: 16 };

      summarySheet.mergeCells("A2:F2");
      summarySheet.getCell("A2").value = `Vue exportée : ${
        filter === "all" ? "Tous" : getWeaponLabel(filter)
      } · 90 jours glissants`;
      summarySheet.getCell("A2").font = { italic: true, size: 11 };

      summarySheet.getCell("A4").value = "Progression";
      summarySheet.getCell("B4").value =
        progressSummary.deltaPercent === null
          ? "N/A"
          : `${progressSummary.deltaPercent > 0 ? "+" : ""}${progressSummary.deltaPercent}%`;
      summarySheet.getCell("C4").value = "Premier relevé";
      summarySheet.getCell("D4").value = progressSummary.firstValue ?? "N/A";
      summarySheet.getCell("E4").value = "Dernier relevé";
      summarySheet.getCell("F4").value = progressSummary.lastValue ?? "N/A";
      summarySheet.getRow(4).font = { bold: true };

      summarySheet.getCell("A5").value = "Jours enregistrés";
      summarySheet.getCell("B5").value = progressSummary.recordedDays;
      summarySheet.getCell("C5").value = "Jours manquants";
      summarySheet.getCell("D5").value = progressSummary.missingDays;
      summarySheet.getCell("E5").value = "Exporté le";
      summarySheet.getCell("F5").value = new Date().toLocaleString("fr-FR");

      const svgElement = graphSvgRef.current;
      if (svgElement && graphData.length) {
        const graphImage = await svgElementToPngDataUrl(svgElement);
        const imageId = workbook.addImage({
          base64: graphImage,
          extension: "png",
        });

        summarySheet.addImage(imageId, {
          tl: { col: 0, row: 6 },
          ext: { width: 920, height: 380 },
        });
      }

      const dataSheet = workbook.addWorksheet("Saisies 90 jours");
      dataSheet.columns = [
        { header: "Date", key: "date", width: 16 },
        { header: "Arme", key: "weaponLabel", width: 16 },
        { header: "KPM", key: "kpm", width: 12 },
      ];

      dataSheet.getRow(1).font = { bold: true };
      dataSheet.views = [{ state: "frozen", ySplit: 1 }];

      for (const row of exportRows) {
        dataSheet.addRow({
          date: row.date,
          weaponLabel: row.weaponLabel,
          kpm: row.kpm,
        });
      }

      dataSheet.getColumn("kpm").numFmt = "0.00";

      const buffer = await workbook.xlsx.writeBuffer();
      downloadBlob(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `playsure-kpm-${pseudo || "player"}-${todayIso}.xlsx`,
      );

      setStatus("Export XLSX téléchargé ✅");
    } catch (error) {
      console.error(error);
      setStatus("Export XLSX impossible ❌");
    } finally {
      setIsExporting(null);
      window.setTimeout(() => setStatus(null), 2500);
    }
  }

  async function handleExportPdf() {
    setIsExporting("pdf");
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const margin = 12;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const contentWidth = pageWidth - margin * 2;

      pdf.setFontSize(16);
      pdf.text(`playSURE KPM — ${pseudo || "Joueur"}`, margin, 16);
      pdf.setFontSize(10);
      pdf.text(
        `Vue : ${filter === "all" ? "Tous" : getWeaponLabel(filter)} · Export : ${new Date().toLocaleString(
          "fr-FR",
        )}`,
        margin,
        22,
      );

      pdf.setFontSize(9);
      pdf.text(
        `Progression : ${
          progressSummary.deltaPercent === null
            ? "N/A"
            : `${progressSummary.deltaPercent > 0 ? "+" : ""}${progressSummary.deltaPercent}%`
        } | Premier : ${progressSummary.firstValue ?? "N/A"} | Dernier : ${
          progressSummary.lastValue ?? "N/A"
        } | Jours enregistrés : ${progressSummary.recordedDays}`,
        margin,
        28,
      );

      const svgElement = graphSvgRef.current;
      let startY = 34;

      if (svgElement && graphData.length) {
        const graphImage = await svgElementToPngDataUrl(svgElement);
        pdf.addImage(graphImage, "PNG", margin, startY, contentWidth, 78);
        startY += 86;
      }

      autoTable(pdf, {
        startY,
        head: [["Date", "Arme", "KPM"]],
        body: exportRows.map((row) => [
          row.date,
          row.weaponLabel,
          row.kpm === null ? "—" : row.kpm.toFixed(2),
        ]),
        margin: { left: margin, right: margin },
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [42, 45, 62] },
        theme: "grid",
      });

      pdf.save(`playsure-kpm-${pseudo || "player"}-${todayIso}.pdf`);
      setStatus("Export PDF téléchargé ✅");
    } catch (error) {
      console.error(error);
      setStatus("Export PDF impossible ❌");
    } finally {
      setIsExporting(null);
      window.setTimeout(() => setStatus(null), 2500);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
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
              <div className="truncate text-sm text-muted">
                Suivi d'entraînement CS2 — 90 jours
              </div>
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

        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            7 derniers jours
          </div>

          <div className="flex flex-wrap gap-2">
            {last7DaysStatus.map((day) => (
              <div
                key={day.date}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  day.hasEntry
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-border/50 bg-card/30 text-muted"
                }`}
                title={
                  day.hasEntry
                    ? "Entraînement enregistré"
                    : "Aucun entraînement enregistré"
                }
              >
                {day.label} · {day.hasEntry ? "Fait" : "Non fait"}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <section className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Saisie du jour — {todayIso}</CardTitle>
            <div className="text-sm text-muted">
              Renseigne le KPM du jour pour chaque arme, puis enregistre la
              journée.
            </div>
          </CardHeader>

          <CardContent>
            {status ? (
              <div className="mb-4 rounded-xl2 border border-border/60 bg-bg/40 px-3 py-2 text-sm">
                {status}
              </div>
            ) : null}

            {todayDraft ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {WEAPONS.map(({ key, label }) => (
                    <div
                      key={key}
                      className="rounded-xl border border-border/50 bg-bg/20 p-3"
                    >
                      <div className="mb-2 text-sm font-semibold">{label}</div>

                      <label className="grid gap-1 text-sm">
                        <span className="text-muted">KPM</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={todayDraft.values[key] ?? ""}
                          onChange={(e) =>
                            setTodayDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    values: {
                                      ...prev.values,
                                      [key]:
                                        e.target.value === ""
                                          ? null
                                          : Number(e.target.value),
                                    },
                                  }
                                : prev,
                            )
                          }
                          className="rounded-lg border border-border/60 bg-card/50 px-2.5 py-1.5 text-sm outline-none focus:border-cs2/60"
                        />
                      </label>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    onClick={onSave}
                    disabled={isSaving}
                    className="rounded-full bg-cs2 px-5 py-2 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? "Enregistrement..." : "Enregistrer la journée"}
                  </button>

                  <div className="text-sm text-muted">
                    Historique conservé : 90 jours glissants
                  </div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Exports</CardTitle>
            <div className="text-sm text-muted">
              JSON brut, XLSX avec graphique + tableau, ou PDF avec graphique
              puis tableau complet des 90 jours.
            </div>
          </CardHeader>

          <CardContent>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleExportJson}
                disabled={isExporting !== null || exportRows.length === 0}
                className="rounded-full border border-border/60 bg-card/40 px-4 py-2 text-sm font-semibold hover:border-cs2/60 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isExporting === "json" ? "Export JSON..." : "Export .json"}
              </button>

              <button
                onClick={handleExportXlsx}
                disabled={isExporting !== null || exportRows.length === 0}
                className="rounded-full border border-border/60 bg-card/40 px-4 py-2 text-sm font-semibold hover:border-cs2/60 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isExporting === "xlsx" ? "Export XLSX..." : "Export .xlsx"}
              </button>

              <button
                onClick={handleExportPdf}
                disabled={isExporting !== null || exportRows.length === 0}
                className="rounded-full border border-border/60 bg-card/40 px-4 py-2 text-sm font-semibold hover:border-cs2/60 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isExporting === "pdf" ? "Export PDF..." : "Export .pdf"}
              </button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Progression</CardTitle>
            <div className="text-sm text-muted">
              Filtre par arme ou vue globale. Les exports reprennent ce
              graphique en tête.
            </div>
          </CardHeader>

          <CardContent>
            <div className="mb-6 flex flex-wrap gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  filter === "all"
                    ? "bg-cs2 text-black"
                    : "border border-border/60 bg-card/40 hover:border-cs2/60"
                }`}
              >
                Tous
              </button>

              {WEAPONS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    filter === key
                      ? "bg-cs2 text-black"
                      : "border border-border/60 bg-card/40 hover:border-cs2/60"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px]">
              <div>
                <MiniLineChart data={graphData} svgRef={graphSvgRef} />

                <div className="mt-4 text-xs text-muted">
                  {filter === "all"
                    ? "Vue Tous : moyenne des KPM renseignés sur la journée."
                    : `Vue ${WEAPONS.find((w) => w.key === filter)?.label ?? ""} : KPM du jour.`}
                </div>
              </div>

              <aside className="rounded-2xl border border-border/50 bg-bg/20 p-4">
                <div className="text-sm font-semibold">Résumé 90 jours</div>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="rounded-xl border border-border/40 bg-card/30 p-3">
                    <div className="text-xs uppercase tracking-wide text-muted">
                      Progression
                    </div>
                    <div
                      className={`mt-1 text-lg font-semibold ${
                        progressSummary.deltaPercent === null
                          ? "text-muted"
                          : progressSummary.deltaPercent >= 0
                            ? "text-emerald-300"
                            : "text-red-300"
                      }`}
                    >
                      {progressSummary.deltaPercent === null
                        ? "N/A"
                        : `${progressSummary.deltaPercent > 0 ? "+" : ""}${progressSummary.deltaPercent}%`}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/40 bg-card/30 p-3">
                    <div className="text-xs uppercase tracking-wide text-muted">
                      Premier relevé
                    </div>
                    <div className="mt-1 text-sm font-medium">
                      {progressSummary.firstValue === null
                        ? "N/A"
                        : progressSummary.firstValue}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/40 bg-card/30 p-3">
                    <div className="text-xs uppercase tracking-wide text-muted">
                      Dernier relevé
                    </div>
                    <div className="mt-1 text-sm font-medium">
                      {progressSummary.lastValue === null
                        ? "N/A"
                        : progressSummary.lastValue}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/40 bg-card/30 p-3">
                    <div className="text-xs uppercase tracking-wide text-muted">
                      Jours enregistrés
                    </div>
                    <div className="mt-1 text-sm font-medium">
                      {progressSummary.recordedDays}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/40 bg-card/30 p-3">
                    <div className="text-xs uppercase tracking-wide text-muted">
                      Jours manquants
                    </div>
                    <div className="mt-1 text-sm font-medium">
                      {progressSummary.missingDays}
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </CardContent>
        </Card>
      </section>

      <footer className="mt-12 border-t border-border/40 py-8 text-center text-xs text-muted">
        © {new Date().getFullYear()} playSURE — Monitoring
      </footer>
    </main>
  );
}
