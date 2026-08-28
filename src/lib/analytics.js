import { inRange } from "@/lib/dateRanges";

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
