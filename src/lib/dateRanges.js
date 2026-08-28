export const PERIOD_PRESETS = [
  { id: "month", label: "Questo mese" },
  { id: "2months", label: "Ultimi 2 mesi" },
  { id: "3months", label: "Ultimi 3 mesi" },
  { id: "6months", label: "Ultimi 6 mesi" },
  { id: "year", label: "Anno corrente" },
  { id: "all", label: "Tutto" },
  { id: "custom", label: "Personalizzato" },
];

export const COMPARISON_OPTIONS = [
  { id: "none", label: "Nessun confronto" },
  { id: "previous", label: "Periodo precedente" },
  { id: "previousYear", label: "Stesso periodo dell'anno scorso" },
];

function iso(date) {
  return date.toISOString().slice(0, 10);
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 12);
}

function addDays(date, amount) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function addYears(date, amount) {
  const copy = new Date(date);
  copy.setFullYear(copy.getFullYear() + amount);
  return copy;
}

export function rangeFromPreset(preset, anchorMonth, transactions = [], customRange) {
  const anchor = new Date(`${anchorMonth}-01T12:00:00`);
  let start;
  let end;

  if (preset === "custom" && customRange?.start && customRange?.end) {
    return {
      start: customRange.start,
      end: customRange.end,
      label: formatRangeLabel(customRange.start, customRange.end),
    };
  }

  if (preset === "all") {
    const dates = transactions.map((item) => item.date).filter(Boolean).sort();
    start = dates[0] || iso(startOfMonth(anchor));
    end = dates.at(-1) || iso(endOfMonth(anchor));
    return { start, end, label: "Tutta la cronologia" };
  }

  if (preset === "year") {
    start = new Date(anchor.getFullYear(), 0, 1, 12);
    end = new Date(anchor.getFullYear(), 11, 31, 12);
  } else {
    const months = { month: 1, "2months": 2, "3months": 3, "6months": 6 }[preset] || 1;
    start = new Date(anchor.getFullYear(), anchor.getMonth() - months + 1, 1, 12);
    end = endOfMonth(anchor);
  }

  return {
    start: iso(start),
    end: iso(end),
    label: formatRangeLabel(iso(start), iso(end)),
  };
}

export function comparisonRange(range, mode) {
  if (mode === "none") return null;

  const start = new Date(`${range.start}T12:00:00`);
  const end = new Date(`${range.end}T12:00:00`);

  if (mode === "previousYear") {
    const previousStart = addYears(start, -1);
    const previousEnd = addYears(end, -1);
    return {
      start: iso(previousStart),
      end: iso(previousEnd),
      label: formatRangeLabel(iso(previousStart), iso(previousEnd)),
    };
  }

  const duration = Math.round((end - start) / 86400000) + 1;
  const previousEnd = addDays(start, -1);
  const previousStart = addDays(previousEnd, -duration + 1);
  return {
    start: iso(previousStart),
    end: iso(previousEnd),
    label: formatRangeLabel(iso(previousStart), iso(previousEnd)),
  };
}

export function inRange(date, range) {
  return Boolean(date && date >= range.start && date <= range.end);
}

export function formatRangeLabel(start, end) {
  const startDate = new Date(`${start}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);
  const sameMonth = startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear();
  const sameYear = startDate.getFullYear() === endDate.getFullYear();

  if (sameMonth && startDate.getDate() === 1 && endDate.getDate() === endOfMonth(endDate).getDate()) {
    return endDate.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
  }

  if (sameYear) {
    return `${startDate.toLocaleDateString("it-IT", { day: "numeric", month: "short" })} - ${endDate.toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })}`;
  }

  return `${startDate.toLocaleDateString("it-IT")} - ${endDate.toLocaleDateString("it-IT")}`;
}

export function chooseGranularity(range) {
  const days = Math.round((new Date(range.end) - new Date(range.start)) / 86400000) + 1;
  if (days <= 45) return "day";
  if (days <= 150) return "week";
  return "month";
}
