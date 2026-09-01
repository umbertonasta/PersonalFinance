export const PERIOD_PRESETS = [
  { id: "month", label: "Questo mese" },
  { id: "year", label: "Anno corrente" },
  { id: "all", label: "Tutto" },
  { id: "custom", label: "Personalizzato" },
];

export const COMPARISON_OPTIONS = [
  { id: "none", label: "Nessun confronto" },
  { id: "previous", label: "Periodo precedente" },
  { id: "previousYear", label: "Stesso periodo dell'anno scorso" },
  ...PERIOD_PRESETS.map((option) => ({
    id: `preset:${option.id}`,
    label: option.label,
  })),
];

export function todayIso() {
  const now = new Date();
  return localIso(now);
}

function localIso(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIso(value) {
  return new Date(`${value}T12:00:00`);
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 12);
}

function addYears(date, amount) {
  const copy = new Date(date);
  copy.setFullYear(copy.getFullYear() + amount);
  return copy;
}

function clampToToday(value) {
  return value > todayIso() ? todayIso() : value;
}

function isCurrentMonth(anchor) {
  const now = new Date();
  return (
    anchor.getFullYear() === now.getFullYear() &&
    anchor.getMonth() === now.getMonth()
  );
}

function isCurrentYear(anchor) {
  return anchor.getFullYear() === new Date().getFullYear();
}

export function rangeFromPreset(
  preset,
  anchorMonth,
  transactions = [],
  customRange,
) {
  const anchor = parseIso(`${anchorMonth}-01`);

  if (preset === "custom" && customRange?.start && customRange?.end) {
    const start = clampToToday(customRange.start);
    const end = clampToToday(customRange.end);
    const normalizedStart = start <= end ? start : end;
    const normalizedEnd = end >= start ? end : start;
    return {
      start: normalizedStart,
      end: normalizedEnd,
      label: formatRangeLabel(normalizedStart, normalizedEnd),
      preset,
    };
  }

  if (preset === "all") {
    const dates = transactions
      .map((item) => item.date)
      .filter(Boolean)
      .map(clampToToday)
      .sort();
    const start = dates[0] || localIso(startOfMonth(anchor));
    const end = dates.at(-1) || clampToToday(localIso(endOfMonth(anchor)));
    return { start, end, label: "Tutta la cronologia", preset };
  }

  if (preset === "year") {
    const start = `${anchor.getFullYear()}-01-01`;
    const end = isCurrentYear(anchor)
      ? todayIso()
      : `${anchor.getFullYear()}-12-31`;
    return { start, end, label: formatRangeLabel(start, end), preset };
  }

  const start = localIso(startOfMonth(anchor));
  const end = isCurrentMonth(anchor)
    ? todayIso()
    : localIso(endOfMonth(anchor));
  return { start, end, label: formatRangeLabel(start, end), preset: "month" };
}

export function comparisonRange(
  range,
  mode,
  anchorMonth,
  transactions = [],
  customComparisonRange,
) {
  if (!mode || mode === "none") return null;

  // "Tutto" contro "Tutto" sarebbe lo stesso identico intervallo.
  if (range.preset === "all" && mode === "preset:all") return null;

  if (String(mode).startsWith("preset:")) {
    const preset = mode.slice("preset:".length);
    return rangeFromPreset(
      preset,
      anchorMonth,
      transactions,
      customComparisonRange,
    );
  }

  const start = parseIso(range.start);
  const end = parseIso(range.end);

  if (mode === "previousYear") {
    const previousStart = localIso(addYears(start, -1));
    const previousEnd = localIso(addYears(end, -1));
    return {
      start: previousStart,
      end: previousEnd,
      label: formatRangeLabel(previousStart, previousEnd),
      preset: "previousYear",
    };
  }

  if (range.preset === "month") {
    const previousMonth = new Date(
      start.getFullYear(),
      start.getMonth() - 1,
      1,
      12,
    );
    const previousStart = localIso(previousMonth);
    const currentMonthStillOpen = isCurrentMonth(start);
    const previousEnd = currentMonthStillOpen
      ? localIso(
          new Date(
            previousMonth.getFullYear(),
            previousMonth.getMonth(),
            Math.min(end.getDate(), endOfMonth(previousMonth).getDate()),
            12,
          ),
        )
      : localIso(endOfMonth(previousMonth));
    return {
      start: previousStart,
      end: previousEnd,
      label: formatRangeLabel(previousStart, previousEnd),
      preset: "previous",
    };
  }

  if (range.preset === "year") {
    const previousStart = `${start.getFullYear() - 1}-01-01`;
    const previousEnd = `${start.getFullYear() - 1}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
    return {
      start: previousStart,
      end: previousEnd,
      label: formatRangeLabel(previousStart, previousEnd),
      preset: "previous",
    };
  }

  const duration = Math.round((end - start) / 86400000) + 1;
  const previousEndDate = new Date(start);
  previousEndDate.setDate(previousEndDate.getDate() - 1);
  const previousStartDate = new Date(previousEndDate);
  previousStartDate.setDate(previousStartDate.getDate() - duration + 1);
  const previousStart = localIso(previousStartDate);
  const previousEnd = localIso(previousEndDate);
  return {
    start: previousStart,
    end: previousEnd,
    label: formatRangeLabel(previousStart, previousEnd),
    preset: "previous",
  };
}

export function rangeDurationDays(range) {
  if (!range) return 0;
  return (
    Math.round((parseIso(range.end) - parseIso(range.start)) / 86400000) + 1
  );
}

export function inRange(date, range) {
  return Boolean(date && date >= range.start && date <= range.end);
}

export function formatRangeLabel(start, end) {
  const startDate = parseIso(start);
  const endDate = parseIso(end);
  const sameMonth =
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getFullYear() === endDate.getFullYear();
  const sameYear = startDate.getFullYear() === endDate.getFullYear();

  if (
    sameMonth &&
    startDate.getDate() === 1 &&
    endDate.getDate() === endOfMonth(endDate).getDate()
  ) {
    return endDate.toLocaleDateString("it-IT", {
      month: "long",
      year: "numeric",
    });
  }

  if (sameYear) {
    return `${startDate.toLocaleDateString("it-IT", { day: "numeric", month: "short" })} - ${endDate.toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })}`;
  }

  return `${startDate.toLocaleDateString("it-IT")} - ${endDate.toLocaleDateString("it-IT")}`;
}

export function chooseGranularity(range) {
  const days = rangeDurationDays(range);
  if (days <= 45) return "day";
  if (days <= 150) return "week";
  return "month";
}
