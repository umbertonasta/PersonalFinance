const STOP_WORDS = new Set([
  "PAGAMENTO",
  "CARTA",
  "POS",
  "ONLINE",
  "ITALIA",
  "IT",
  "EU",
  "COM",
  "SRL",
  "SPA",
  "SAS",
  "VIA",
  "DEL",
  "DELLA",
  "PER",
  "CON",
  "DA",
]);

export function normalizeClassificationText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\b\d{2,}\b/g, " ")
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value) {
  return normalizeClassificationText(value)
    .split(" ")
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

function dice(first, second) {
  const a = new Set(tokens(first));
  const b = new Set(tokens(second));
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return (2 * intersection) / (a.size + b.size);
}

function same(left, right) {
  return (left || null) === (right || null);
}

export function classificationDiffers(candidate, existing) {
  return !(
    same(candidate.categoryId, existing.category_id) &&
    same(candidate.subcategoryId, existing.subcategory_id) &&
    same(candidate.microcategoryId, existing.microcategory_id)
  );
}

export function findSimilarClassifications({
  candidate,
  transactions,
  currentId,
}) {
  const candidateRaw = candidate.rawDescription || candidate.description;
  const candidateMerchant = candidate.description;

  return transactions
    .filter(
      (item) =>
        item.id !== currentId &&
        item.review_status === "verified" &&
        item.category_id,
    )
    .map((item) => {
      const rawScore = dice(
        candidateRaw,
        item.raw_description || item.description,
      );
      const merchantScore = dice(
        candidateMerchant,
        item.normalized_merchant || item.description,
      );
      const exactMerchant =
        normalizeClassificationText(candidateMerchant).length >= 3 &&
        normalizeClassificationText(candidateMerchant) ===
          normalizeClassificationText(
            item.normalized_merchant || item.description,
          );
      const score = Math.max(rawScore, merchantScore, exactMerchant ? 1 : 0);
      return {
        transaction: item,
        score,
        differs: classificationDiffers(candidate, item),
        reason: exactMerchant
          ? "Stesso esercente"
          : rawScore >= merchantScore
            ? "Descrizione bancaria simile"
            : "Nome simile",
      };
    })
    .filter((match) => match.score >= 0.58 && match.differs)
    .sort((first, second) => second.score - first.score)
    .slice(0, 5);
}

export function mostCommonClassification(matches) {
  const groups = new Map();
  for (const match of matches) {
    const item = match.transaction;
    const key = [item.category_id, item.subcategory_id, item.microcategory_id]
      .map((value) => value || "")
      .join("|");
    const group = groups.get(key) || {
      categoryId: item.category_id || "",
      subcategoryId: item.subcategory_id || "",
      microcategoryId: item.microcategory_id || "",
      category: item.category || null,
      count: 0,
    };
    group.count += 1;
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => b.count - a.count)[0] || null;
}
