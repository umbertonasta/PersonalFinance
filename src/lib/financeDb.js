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

function fromTransactionRow(row) {
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
    category_id: row.category_id,
    subcategory_id: row.subcategory_id,
    microcategory_id: row.microcategory_id,
    notes: row.notes || "",
    tag_ids: row.tag_ids || [],
    suggested_category: row.suggested_category,
    confidence: row.confidence === null ? null : Number(row.confidence),
    review_status: row.review_status,
    source: row.source,
    external_id: row.external_id,
    bank_status: row.bank_status,
    recurring: Boolean(row.recurring),
  };
}

function toTransactionRow(transaction, userId) {
  return {
    user_id: userId,
    account_id: transaction.account_id || null,
    transaction_type: transaction.type,
    amount: Number(transaction.amount),
    transaction_date: transaction.date,
    description: transaction.description || "Movimento",
    raw_description:
      transaction.raw_description || transaction.description || "",
    normalized_merchant: transaction.normalized_merchant || null,
    category: transaction.category || null,
    category_id: transaction.categoryId || transaction.category_id || null,
    subcategory_id:
      transaction.subcategoryId || transaction.subcategory_id || null,
    microcategory_id: transaction.microcategoryId || transaction.microcategory_id || null,
    notes: transaction.notes || null,
    suggested_category: transaction.suggested_category || null,
    confidence:
      transaction.confidence == null ? null : Number(transaction.confidence),
    review_status: transaction.review_status || "verified",
    source: transaction.source || "manual",
    external_id: transaction.external_id || null,
    bank_status: transaction.bank_status || "booked",
    recurring: Boolean(transaction.recurring),
  };
}

export async function checkAuthenticatedDatabase() {
  const user = await getCurrentUser();
  const { count, error } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return { userId: user.id, transactionCount: count || 0 };
}

export async function loadFinanceData() {
  await getCurrentUser();
  const [transactionsResult, rulesResult, budgetsResult, accountsResult] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("*")
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase.from("merchant_rules").select("*").order("created_at"),
      supabase.from("budgets").select("*").order("category"),
      supabase.from("accounts").select("*").order("created_at"),
    ]);
  const error = [
    transactionsResult.error,
    rulesResult.error,
    budgetsResult.error,
    accountsResult.error,
  ].find(Boolean);
  if (error) throw error;

  const transactionRows = transactionsResult.data || [];
  const transactionIds = transactionRows.map((row) => row.id);
  const tagMap = new Map();

  if (transactionIds.length > 0) {
    const { data: tagLinks, error: tagError } = await supabase
      .from("transaction_tags")
      .select("transaction_id, tag_id")
      .in("transaction_id", transactionIds);
    if (tagError) throw tagError;
    for (const link of tagLinks || []) {
      const current = tagMap.get(link.transaction_id) || [];
      current.push(link.tag_id);
      tagMap.set(link.transaction_id, current);
    }
  }

  return {
    transactions: transactionRows.map((row) =>
      fromTransactionRow({ ...row, tag_ids: tagMap.get(row.id) || [] }),
    ),
    rules: (rulesResult.data || []).map((row) => ({
      id: row.id,
      pattern: row.pattern,
      normalized_merchant: row.normalized_merchant || "",
      category: row.category,
      category_id: row.category_id,
      subcategory_id: row.subcategory_id,
      microcategory_id: row.microcategory_id,
      remember_microcategory: row.remember_microcategory,
      active: row.active,
    })),
    budgets: Object.fromEntries(
      (budgetsResult.data || []).map((row) => [
        row.category,
        Number(row.monthly_limit),
      ]),
    ),
    accounts: (accountsResult.data || []).map((row) => ({
      id: row.id,
      name: row.name,
      institution: row.institution,
      type: row.account_type,
      currency: row.currency,
      status: row.status,
      last_sync_at: row.last_sync_at,
    })),
  };
}

export async function createTransaction(transaction) {
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from("transactions")
    .insert(toTransactionRow(transaction, user.id))
    .select("*")
    .single();
  if (error) throw error;
  return fromTransactionRow(data);
}

export async function updateTransaction(transactionId, changes) {
  const map = {
    type: "transaction_type",
    amount: "amount",
    date: "transaction_date",
    description: "description",
    raw_description: "raw_description",
    normalized_merchant: "normalized_merchant",
    category: "category",
    categoryId: "category_id",
    category_id: "category_id",
    subcategoryId: "subcategory_id",
    subcategory_id: "subcategory_id",
    microcategoryId: "microcategory_id",
    microcategory_id: "microcategory_id",
    notes: "notes",
    suggested_category: "suggested_category",
    confidence: "confidence",
    review_status: "review_status",
    source: "source",
    bank_status: "bank_status",
    recurring: "recurring",
  };
  const databaseChanges = {};
  for (const [key, column] of Object.entries(map)) {
    if (key in changes)
      databaseChanges[column] = changes[key] === "" ? null : changes[key];
  }
  const { data, error } = await supabase
    .from("transactions")
    .update(databaseChanges)
    .eq("id", transactionId)
    .select("*")
    .single();
  if (error) throw error;
  return fromTransactionRow(data);
}

export async function deleteTransaction(transactionId) {
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", transactionId);
  if (error) throw error;
}

export async function upsertMerchantRule(rule) {
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from("merchant_rules")
    .upsert(
      {
        user_id: user.id,
        pattern: rule.pattern,
        normalized_merchant: rule.normalized_merchant || null,
        category: rule.category,
        category_id: rule.categoryId || rule.category_id || null,
        subcategory_id: rule.subcategoryId || rule.subcategory_id || null,
        microcategory_id: rule.rememberMicrocategory
          ? rule.microcategoryId || rule.microcategory_id || null
          : null,
        remember_microcategory: Boolean(rule.rememberMicrocategory),
        active: rule.active !== false,
      },
      { onConflict: "user_id,pattern" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    pattern: data.pattern,
    normalized_merchant: data.normalized_merchant || "",
    category: data.category,
    category_id: data.category_id,
    subcategory_id: data.subcategory_id,
    microcategory_id: data.microcategory_id,
    remember_microcategory: data.remember_microcategory,
    active: data.active,
  };
}

export async function saveBudgets(budgets) {
  const user = await getCurrentUser();
  const rows = Object.entries(budgets)
    .filter(([, value]) => value !== "" && Number(value) >= 0)
    .map(([category, value]) => ({
      user_id: user.id,
      category,
      monthly_limit: Number(value),
    }));
  const { error: deleteError } = await supabase
    .from("budgets")
    .delete()
    .eq("user_id", user.id);
  if (deleteError) throw deleteError;
  if (rows.length) {
    const { error } = await supabase.from("budgets").insert(rows);
    if (error) throw error;
  }
  return Object.fromEntries(
    rows.map((row) => [row.category, row.monthly_limit]),
  );
}

export async function setTransactionTags(transactionId, tagIds = []) {
  const user = await getCurrentUser();
  const { error: deleteError } = await supabase
    .from("transaction_tags")
    .delete()
    .eq("transaction_id", transactionId);
  if (deleteError) throw deleteError;

  const uniqueIds = [...new Set(tagIds.filter(Boolean))];
  if (uniqueIds.length > 0) {
    const { error: insertError } = await supabase
      .from("transaction_tags")
      .insert(
        uniqueIds.map((tagId) => ({
          transaction_id: transactionId,
          tag_id: tagId,
          user_id: user.id,
        })),
      );
    if (insertError) throw insertError;
  }
  return uniqueIds;
}
