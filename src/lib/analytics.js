import { inRange } from "@/lib/dateRanges";

export function needsClassification(item) {
  return (
    item?.type === "expense" &&
    (item.review_status !== "verified" || !item.category_id)
  );
}

export function isClassifiedExpense(item) {
  return (
    item?.type === "expense" &&
    item.review_status === "verified" &&
    Boolean(item.category_id)
  );
}

const DAY_NAMES = [
  "Domenica",
  "Lunedi",
  "Martedi",
  "Mercoledi",
  "Giovedi",
  "Venerdi",
  "Sabato",
];

export function expenseRows(transactions, range) {
  return transactions.filter(
    (item) => item.type === "expense" && inRange(item.date, range),
  );
}

export function buildWeekdayAnalysis(rows) {
  const buckets = DAY_NAMES.map((name, day) => ({
    key: String(day),
    name,
    shortName: name.slice(0, 3),
    total: 0,
    count: 0,
    rows: [],
  }));

  rows.forEach((item) => {
    const day = new Date(`${item.date}T12:00:00`).getDay();
    buckets[day].total += Number(item.amount);
    buckets[day].count += 1;
    buckets[day].rows.push(item);
  });

  return buckets.map((bucket) => ({
    ...bucket,
    average: bucket.count ? bucket.total / bucket.count : 0,
  }));
}

export function buildAmountBands(rows) {
  const bands = [
    { key: "0-5", name: "Fino a 5 €", min: 0, max: 5 },
    { key: "5-20", name: "5-20 €", min: 5, max: 20 },
    { key: "20-50", name: "20-50 €", min: 20, max: 50 },
    { key: "50-100", name: "50-100 €", min: 50, max: 100 },
    { key: "100+", name: "Oltre 100 €", min: 100, max: Infinity },
  ];

  return bands.map((band) => {
    const matching = rows.filter((item) => {
      const amount = Number(item.amount);
      return amount > band.min && amount <= band.max;
    });
    return {
      ...band,
      count: matching.length,
      total: matching.reduce((sum, item) => sum + Number(item.amount), 0),
      rows: matching,
    };
  });
}

export function buildCumulative(rows, range, comparisonRows = []) {
  return [
    ...cumulativeSeries(rows, range, "Periodo scelto"),
    ...cumulativeSeries(comparisonRows, range, "Confronto", true),
  ];
}

function cumulativeSeries(rows, range, series, normalizeDates = false) {
  const start = new Date(`${range.start}T12:00:00`);
  const end = new Date(`${range.end}T12:00:00`);
  const byOffset = new Map();

  rows.forEach((item) => {
    const itemDate = new Date(`${item.date}T12:00:00`);
    const offset = normalizeDates
      ? Math.max(
          0,
          Math.round(
            (itemDate - new Date(`${rows[0]?.date || range.start}T12:00:00`)) /
              86400000,
          ),
        )
      : Math.max(0, Math.round((itemDate - start) / 86400000));
    byOffset.set(offset, (byOffset.get(offset) || 0) + Number(item.amount));
  });

  const length = Math.max(1, Math.round((end - start) / 86400000) + 1);
  let total = 0;
  return Array.from({ length }, (_, index) => {
    total += byOffset.get(index) || 0;
    return { index, label: `Giorno ${index + 1}`, value: total, series };
  });
}

export function buildChangeDrivers(
  transactions,
  range,
  compareRange,
  categories = [],
) {
  const categoryMap = new Map(categories.map((item) => [item.id, item]));
  const collect = (selectedRange) => {
    const totals = new Map();
    if (!selectedRange) return totals;
    expenseRows(transactions, selectedRange).forEach((item) => {
      const key = needsClassification(item) ? "pending" : item.category_id;
      totals.set(key, (totals.get(key) || 0) + Number(item.amount));
    });
    return totals;
  };
  const current = collect(range);
  const comparison = collect(compareRange);
  const keys = new Set([...current.keys(), ...comparison.keys()]);
  return [...keys]
    .map((key) => {
      const category = categoryMap.get(key);
      const currentValue = current.get(key) || 0;
      const comparisonValue = comparison.get(key) || 0;
      return {
        key,
        categoryId: category?.id || null,
        name: category?.name || "Da classificare",
        icon: category?.icon || "?",
        current: currentValue,
        comparison: comparisonValue,
        difference: currentValue - comparisonValue,
        variation: comparisonValue
          ? ((currentValue - comparisonValue) / comparisonValue) * 100
          : null,
        rows: expenseRows(transactions, range).filter(
          (item) =>
            (needsClassification(item) ? "pending" : item.category_id) === key,
        ),
      };
    })
    .filter((item) => item.current || item.comparison)
    .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
}

export function buildWeekendComparison(transactions, range) {
  const rows = expenseRows(transactions, range);
  const groups = [
    {
      key: "workdays",
      name: "Giorni lavorativi",
      total: 0,
      count: 0,
      days: new Set(),
      rows: [],
    },
    {
      key: "weekend",
      name: "Weekend",
      total: 0,
      count: 0,
      days: new Set(),
      rows: [],
    },
  ];
  rows.forEach((item) => {
    const day = new Date(`${item.date}T12:00:00`).getDay();
    const group = groups[day === 0 || day === 6 ? 1 : 0];
    group.total += Number(item.amount);
    group.count += 1;
    group.days.add(item.date);
    group.rows.push(item);
  });
  return groups.map((group) => ({
    ...group,
    days: group.days.size,
    dailyAverage: group.days.size ? group.total / group.days.size : 0,
  }));
}

export function buildMonthPhases(transactions, range) {
  const rows = expenseRows(transactions, range);
  const phases = [
    {
      key: "early",
      name: "Giorni 1-10",
      min: 1,
      max: 10,
      total: 0,
      count: 0,
      rows: [],
    },
    {
      key: "middle",
      name: "Giorni 11-20",
      min: 11,
      max: 20,
      total: 0,
      count: 0,
      rows: [],
    },
    {
      key: "late",
      name: "Giorni 21-fine",
      min: 21,
      max: 31,
      total: 0,
      count: 0,
      rows: [],
    },
  ];
  rows.forEach((item) => {
    const day = Number(item.date.slice(8, 10));
    const phase = phases.find((entry) => day >= entry.min && day <= entry.max);
    phase.total += Number(item.amount);
    phase.count += 1;
    phase.rows.push(item);
  });
  const total = phases.reduce((sum, item) => sum + item.total, 0);
  return phases.map((item) => ({
    ...item,
    share: total ? (item.total / total) * 100 : 0,
  }));
}
