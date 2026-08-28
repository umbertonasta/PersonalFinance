const HYPE_HEADERS = [
  "Data operazione",
  "Data contabile",
  "Iban",
  "Tipologia",
  "Nome",
  "Descrizione",
  "Importo ( € )",
];

function clean(value) {
  return String(value ?? "").replace(/^\uFEFF/, "").trim();
}

function normalizeHeader(value) {
  return clean(value).replace(/\s+/g, " ").toLowerCase();
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"') {
      if (quoted && nextCharacter === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && nextCharacter === "\n") index += 1;
      row.push(field);
      if (row.some((value) => clean(value) !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  row.push(field);
  if (row.some((value) => clean(value) !== "")) rows.push(row);
  return rows;
}

function parseItalianDate(value) {
  const match = clean(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function parseAmount(value) {
  const normalized = clean(value)
    .replace(/\s/g, "")
    .replace(/€/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function normalizeText(value) {
  return clean(value).replace(/\s+/g, " ");
}

function stableHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function findRule(text, rules) {
  const upperText = text.toUpperCase();
  return rules.find(
    (rule) =>
      rule.active !== false &&
      rule.pattern &&
      upperText.includes(rule.pattern.toUpperCase()),
  );
}

function suggestCategory(name, description, type) {
  if (type === "income") return null;
  const text = `${name} ${description}`.toUpperCase();
  const suggestions = [
    [["SPOTIFY", "DISNEY", "APPLE.COM/BILL", "GOOGLE ONE", "YOUTUBE"], "Abbonamenti", 0.96],
    [["TRAINLINE", "TRENORD", "TICKET ATM", "MYCICERO", "TRASPORTI"], "Trasporti", 0.95],
    [["CARREFOUR", "BENNET", "ESSELUNGA", "LIDL", "MARKET"], "Alimentari", 0.95],
    [["AMAZON", "AMZN", "MEDIAWORLD", "VINTED", "ZALANDO", "BERSHKA", "PULL"], "Shopping", 0.72],
    [["BARBER", "FARMAC", "DENT", "CENTRO INTERPARTIMENTALE"], "Salute", 0.7],
    [["CAFE", "BAR ", "RISTORANTE", "DELIVEROO", "KFC", "MC DONALD", "MCDONALD"], "Tempo libero", 0.72],
  ];

  for (const [patterns, category, confidence] of suggestions) {
    if (patterns.some((pattern) => text.includes(pattern))) {
      return { category, confidence };
    }
  }
  return null;
}

function classifyTransaction(transaction, rules) {
  const searchableText = `${transaction.name} ${transaction.raw_description}`;
  if (/KLARNA/i.test(searchableText)) {
    return { ...transaction, category: null, category_id: null, subcategory_id: null, microcategory_id: null, suggested_category: null, confidence: 0, review_status: "needs_review" };
  }
  const personalRule = findRule(searchableText, rules);

  if (personalRule) {
    return {
      ...transaction,
      description: personalRule.normalized_merchant || transaction.name,
      normalized_merchant: personalRule.normalized_merchant || transaction.name,
      category: personalRule.category,
      category_id: personalRule.category_id || null,
      subcategory_id: personalRule.subcategory_id || null,
      microcategory_id: personalRule.remember_microcategory ? personalRule.microcategory_id || null : null,
      suggested_category: null,
      confidence: 1,
      review_status: "verified",
    };
  }

  if (transaction.type === "income") {
    const isSalary = /ACCREDITO COMPETENZE|STIPENDIO/i.test(
      transaction.raw_description,
    );
    return {
      ...transaction,
      category: isSalary ? "Stipendio" : "Altro",
      confidence: isSalary ? 0.98 : 0.8,
      review_status: "verified",
    };
  }

  const suggestion = suggestCategory(
    transaction.name,
    transaction.raw_description,
    transaction.type,
  );

  if (suggestion?.confidence >= 0.9) {
    return {
      ...transaction,
      category: suggestion.category,
      suggested_category: null,
      confidence: suggestion.confidence,
      review_status: "verified",
    };
  }

  return {
    ...transaction,
    category: null,
    suggested_category: suggestion?.category || null,
    confidence: suggestion?.confidence || 0.1,
    review_status: suggestion ? "needs_review" : "unclassified",
  };
}

export function parseHypeCsv(text, rules = []) {
  const rows = parseCsvRows(text);
  if (rows.length < 2) throw new Error("Il CSV non contiene movimenti.");

  const headers = rows[0].map(normalizeHeader);
  const expected = HYPE_HEADERS.map(normalizeHeader);
  const positions = Object.fromEntries(
    expected.map((header) => [header, headers.indexOf(header)]),
  );

  const missing = expected.filter((header) => positions[header] < 0);
  if (missing.length) {
    throw new Error("Il file non sembra un CSV movimenti HYPE compatibile.");
  }

  const mapped = [];
  const errors = [];
  const occurrenceMap = new Map();

  rows.slice(1).forEach((row, rowIndex) => {
    const get = (header) => row[positions[normalizeHeader(header)]];
    const date = parseItalianDate(get("Data operazione"));
    const bookingDate = parseItalianDate(get("Data contabile"));
    const signedAmount = parseAmount(get("Importo ( € )"));
    const name = normalizeText(get("Nome")) || "Movimento HYPE";
    const description = normalizeText(get("Descrizione")) || name;
    const bankType = normalizeText(get("Tipologia"));

    if (!date || signedAmount === null || signedAmount === 0) {
      errors.push({ row: rowIndex + 2, reason: "Data o importo non valido" });
      return;
    }

    const fingerprintBase = [
      date,
      bookingDate || "pending",
      bankType,
      name,
      description,
      signedAmount.toFixed(2),
    ].join("|");
    const occurrence = (occurrenceMap.get(fingerprintBase) || 0) + 1;
    occurrenceMap.set(fingerprintBase, occurrence);

    const transaction = {
      type: signedAmount < 0 ? "expense" : "income",
      amount: Math.abs(signedAmount),
      date,
      booking_date: bookingDate,
      description: name,
      name,
      raw_description: description,
      normalized_merchant: name,
      bank_type: bankType,
      source: "csv",
      bank_status: bookingDate ? "booked" : "pending",
      recurring: false,
      external_id: `hype:${stableHash(`${fingerprintBase}|${occurrence}`)}`,
    };

    mapped.push(classifyTransaction(transaction, rules));
  });

  return {
    transactions: mapped,
    errors,
    summary: {
      total: mapped.length,
      income: mapped.filter((item) => item.type === "income").length,
      expenses: mapped.filter((item) => item.type === "expense").length,
      automatic: mapped.filter((item) => item.review_status === "verified").length,
      review: mapped.filter((item) => item.review_status !== "verified").length,
      pending: mapped.filter((item) => item.bank_status === "pending").length,
    },
  };
}
