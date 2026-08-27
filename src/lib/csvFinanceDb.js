import { supabase } from "@/lib/supabase";

async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) throw new Error("Nessun utente autenticato.");
  return user;
}

function toDatabaseRow(transaction, userId) {
  return {
    user_id: userId,
    account_id: null,
    transaction_type: transaction.type,
    amount: Number(transaction.amount),
    transaction_date: transaction.date,
    description: transaction.description || "Movimento HYPE",
    raw_description:
      transaction.raw_description || transaction.description || "",
    normalized_merchant: transaction.normalized_merchant || null,
    category: transaction.category || null,
    suggested_category: transaction.suggested_category || null,
    confidence:
      transaction.confidence == null ? null : Number(transaction.confidence),
    review_status: transaction.review_status || "unclassified",
    source: "csv",
    external_id: transaction.external_id,
    bank_status: transaction.bank_status || "booked",
    recurring: Boolean(transaction.recurring),
  };
}

function fromDatabaseRow(row) {
  return {
    id: row.id,
    account_id: row.account_id,
    type: row.transaction_type,
    amount: Number(row.amount),
    date: row.transaction_date,
    description: row.description,
    raw_description: row.raw_description || "",
    normalized_merchant: row.normalized_merchant || "",
    category: row.category,
    suggested_category: row.suggested_category,
    confidence: row.confidence == null ? null : Number(row.confidence),
    review_status: row.review_status,
    source: row.source,
    external_id: row.external_id,
    bank_status: row.bank_status,
    recurring: Boolean(row.recurring),
  };
}

export async function importCsvTransactions(transactions) {
  const user = await getCurrentUser();
  const externalIds = transactions
    .map((transaction) => transaction.external_id)
    .filter(Boolean);

  if (!externalIds.length) {
    throw new Error("Il file non contiene identificativi importabili.");
  }

  const existingIds = new Set();
  const batchSize = 100;

  for (let index = 0; index < externalIds.length; index += batchSize) {
    const batch = externalIds.slice(index, index + batchSize);
    const { data, error } = await supabase
      .from("transactions")
      .select("external_id")
      .in("external_id", batch);

    if (error) throw error;
    for (const row of data || []) existingIds.add(row.external_id);
  }

  const newTransactions = transactions.filter(
    (transaction) => !existingIds.has(transaction.external_id),
  );

  if (!newTransactions.length) {
    return {
      inserted: [],
      insertedCount: 0,
      duplicateCount: transactions.length,
    };
  }

  const inserted = [];

  for (let index = 0; index < newTransactions.length; index += batchSize) {
    const batch = newTransactions
      .slice(index, index + batchSize)
      .map((transaction) => toDatabaseRow(transaction, user.id));

    const { data, error } = await supabase
      .from("transactions")
      .insert(batch)
      .select("*");

    if (error) throw error;
    inserted.push(...(data || []).map(fromDatabaseRow));
  }

  return {
    inserted,
    insertedCount: inserted.length,
    duplicateCount: transactions.length - inserted.length,
  };
}
