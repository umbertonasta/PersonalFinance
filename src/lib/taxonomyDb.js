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

function cleanName(name) {
  const value = String(name || "").replace(/\s+/g, " ").trim();

  if (!value) {
    throw new Error("Il nome non può essere vuoto.");
  }

  return value;
}

function normalizeColor(color, fallback = "#64748b") {
  const value = String(color || "").trim();
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

async function throwIfError(result) {
  if (result.error) throw result.error;
  return result.data;
}

export async function loadTaxonomy({ includeHidden = true } = {}) {
  await getCurrentUser();

  let categoriesQuery = supabase
    .from("categories")
    .select("*")
    .order("sort_order")
    .order("name");

  let subcategoriesQuery = supabase
    .from("subcategories")
    .select("*")
    .order("sort_order")
    .order("name");

  let purposesQuery = supabase
    .from("purposes")
    .select("*")
    .order("sort_order")
    .order("name");

  let tagsQuery = supabase
    .from("tags")
    .select("*")
    .order("name");

  if (!includeHidden) {
    categoriesQuery = categoriesQuery.eq("is_hidden", false);
    subcategoriesQuery = subcategoriesQuery.eq("is_hidden", false);
    purposesQuery = purposesQuery.eq("is_hidden", false);
    tagsQuery = tagsQuery.eq("is_hidden", false);
  }

  const [categories, subcategories, purposes, tags] = await Promise.all([
    throwIfError(await categoriesQuery),
    throwIfError(await subcategoriesQuery),
    throwIfError(await purposesQuery),
    throwIfError(await tagsQuery),
  ]);

  return {
    categories: categories || [],
    subcategories: subcategories || [],
    purposes: purposes || [],
    tags: tags || [],
  };
}

export async function createCategory({
  name,
  icon = "📦",
  color = "#64748b",
  categoryType = "expense",
}) {
  const user = await getCurrentUser();

  const { count, error: countError } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true });

  if (countError) throw countError;

  const { data, error } = await supabase
    .from("categories")
    .insert({
      user_id: user.id,
      name: cleanName(name),
      icon: String(icon || "📦").trim() || "📦",
      color: normalizeColor(color),
      category_type: categoryType,
      sort_order: count || 0,
      is_hidden: false,
      is_system: false,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateCategory(categoryId, changes) {
  const databaseChanges = {};

  if ("name" in changes) databaseChanges.name = cleanName(changes.name);
  if ("icon" in changes) {
    databaseChanges.icon = String(changes.icon || "📦").trim() || "📦";
  }
  if ("color" in changes) {
    databaseChanges.color = normalizeColor(changes.color);
  }
  if ("categoryType" in changes) {
    databaseChanges.category_type = changes.categoryType;
  }
  if ("sortOrder" in changes) {
    databaseChanges.sort_order = Number(changes.sortOrder);
  }
  if ("isHidden" in changes) {
    databaseChanges.is_hidden = Boolean(changes.isHidden);
  }

  if (!Object.keys(databaseChanges).length) {
    throw new Error("Nessuna modifica da salvare.");
  }

  const { data, error } = await supabase
    .from("categories")
    .update(databaseChanges)
    .eq("id", categoryId)
    .select("*")
    .single();

  if (error) throw error;

  if (databaseChanges.name) {
    const { error: transactionError } = await supabase
      .from("transactions")
      .update({ category: databaseChanges.name })
      .eq("category_id", categoryId);

    if (transactionError) throw transactionError;

    const { error: ruleError } = await supabase
      .from("merchant_rules")
      .update({ category: databaseChanges.name })
      .eq("category_id", categoryId);

    if (ruleError) throw ruleError;
  }

  return data;
}

export async function createSubcategory({
  categoryId,
  name,
  icon = null,
  color = null,
}) {
  const user = await getCurrentUser();

  if (!categoryId) throw new Error("Seleziona una categoria.");

  const { count, error: countError } = await supabase
    .from("subcategories")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId);

  if (countError) throw countError;

  const { data, error } = await supabase
    .from("subcategories")
    .insert({
      user_id: user.id,
      category_id: categoryId,
      name: cleanName(name),
      icon: icon ? String(icon).trim() : null,
      color: color ? normalizeColor(color) : null,
      sort_order: count || 0,
      is_hidden: false,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateSubcategory(subcategoryId, changes) {
  const databaseChanges = {};

  if ("name" in changes) databaseChanges.name = cleanName(changes.name);
  if ("categoryId" in changes) {
    databaseChanges.category_id = changes.categoryId;
  }
  if ("icon" in changes) {
    databaseChanges.icon = changes.icon ? String(changes.icon).trim() : null;
  }
  if ("color" in changes) {
    databaseChanges.color = changes.color
      ? normalizeColor(changes.color)
      : null;
  }
  if ("sortOrder" in changes) {
    databaseChanges.sort_order = Number(changes.sortOrder);
  }
  if ("isHidden" in changes) {
    databaseChanges.is_hidden = Boolean(changes.isHidden);
  }

  const { data, error } = await supabase
    .from("subcategories")
    .update(databaseChanges)
    .eq("id", subcategoryId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function createPurpose({
  name,
  icon = null,
  color = null,
}) {
  const user = await getCurrentUser();

  const { count, error: countError } = await supabase
    .from("purposes")
    .select("id", { count: "exact", head: true });

  if (countError) throw countError;

  const { data, error } = await supabase
    .from("purposes")
    .insert({
      user_id: user.id,
      name: cleanName(name),
      icon: icon ? String(icon).trim() : null,
      color: color ? normalizeColor(color) : null,
      sort_order: count || 0,
      is_hidden: false,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updatePurpose(purposeId, changes) {
  const databaseChanges = {};

  if ("name" in changes) databaseChanges.name = cleanName(changes.name);
  if ("icon" in changes) {
    databaseChanges.icon = changes.icon ? String(changes.icon).trim() : null;
  }
  if ("color" in changes) {
    databaseChanges.color = changes.color
      ? normalizeColor(changes.color)
      : null;
  }
  if ("sortOrder" in changes) {
    databaseChanges.sort_order = Number(changes.sortOrder);
  }
  if ("isHidden" in changes) {
    databaseChanges.is_hidden = Boolean(changes.isHidden);
  }

  const { data, error } = await supabase
    .from("purposes")
    .update(databaseChanges)
    .eq("id", purposeId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function createTag({ name, color = "#64748b" }) {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("tags")
    .insert({
      user_id: user.id,
      name: cleanName(name),
      color: normalizeColor(color),
      is_hidden: false,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateTag(tagId, changes) {
  const databaseChanges = {};

  if ("name" in changes) databaseChanges.name = cleanName(changes.name);
  if ("color" in changes) {
    databaseChanges.color = normalizeColor(changes.color);
  }
  if ("isHidden" in changes) {
    databaseChanges.is_hidden = Boolean(changes.isHidden);
  }

  const { data, error } = await supabase
    .from("tags")
    .update(databaseChanges)
    .eq("id", tagId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getTaxonomyUsage(type, itemId) {
  if (type === "category") {
    const [transactions, rules, subcategories] = await Promise.all([
      supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("category_id", itemId),
      supabase
        .from("merchant_rules")
        .select("id", { count: "exact", head: true })
        .eq("category_id", itemId),
      supabase
        .from("subcategories")
        .select("id", { count: "exact", head: true })
        .eq("category_id", itemId),
    ]);

    const error = [transactions.error, rules.error, subcategories.error].find(
      Boolean,
    );
    if (error) throw error;

    return {
      transactions: transactions.count || 0,
      rules: rules.count || 0,
      children: subcategories.count || 0,
    };
  }

  if (type === "subcategory" || type === "purpose") {
    const column = type === "subcategory" ? "subcategory_id" : "purpose_id";
    const [transactions, rules] = await Promise.all([
      supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq(column, itemId),
      supabase
        .from("merchant_rules")
        .select("id", { count: "exact", head: true })
        .eq(column, itemId),
    ]);

    const error = [transactions.error, rules.error].find(Boolean);
    if (error) throw error;

    return {
      transactions: transactions.count || 0,
      rules: rules.count || 0,
      children: 0,
    };
  }

  if (type === "tag") {
    const result = await supabase
      .from("transaction_tags")
      .select("transaction_id", { count: "exact", head: true })
      .eq("tag_id", itemId);

    if (result.error) throw result.error;

    return {
      transactions: result.count || 0,
      rules: 0,
      children: 0,
    };
  }

  throw new Error("Tipo di elemento non riconosciuto.");
}

export async function deleteTaxonomyItem(type, itemId) {
  const usage = await getTaxonomyUsage(type, itemId);
  const isUsed = usage.transactions > 0 || usage.rules > 0 || usage.children > 0;

  if (isUsed) {
    throw new Error(
      "Questo elemento è utilizzato. Nascondilo oppure sposta prima i dati collegati.",
    );
  }

  const tableMap = {
    category: "categories",
    subcategory: "subcategories",
    purpose: "purposes",
    tag: "tags",
  };

  const table = tableMap[type];
  if (!table) throw new Error("Tipo di elemento non riconosciuto.");

  const { error } = await supabase.from(table).delete().eq("id", itemId);
  if (error) throw error;

  return true;
}

export async function mergeSubcategories(sourceId, destinationId) {
  if (sourceId === destinationId) {
    throw new Error("Scegli una sottocategoria diversa.");
  }

  const { data: destination, error: destinationError } = await supabase
    .from("subcategories")
    .select("id, category_id")
    .eq("id", destinationId)
    .single();

  if (destinationError) throw destinationError;

  const { error: transactionError } = await supabase
    .from("transactions")
    .update({
      category_id: destination.category_id,
      subcategory_id: destinationId,
    })
    .eq("subcategory_id", sourceId);

  if (transactionError) throw transactionError;

  const { error: ruleError } = await supabase
    .from("merchant_rules")
    .update({
      category_id: destination.category_id,
      subcategory_id: destinationId,
    })
    .eq("subcategory_id", sourceId);

  if (ruleError) throw ruleError;

  const { error: deleteError } = await supabase
    .from("subcategories")
    .delete()
    .eq("id", sourceId);

  if (deleteError) throw deleteError;

  return true;
}

export async function mergePurposes(sourceId, destinationId) {
  if (sourceId === destinationId) {
    throw new Error("Scegli una finalità diversa.");
  }

  const { error: transactionError } = await supabase
    .from("transactions")
    .update({ purpose_id: destinationId })
    .eq("purpose_id", sourceId);

  if (transactionError) throw transactionError;

  const { error: ruleError } = await supabase
    .from("merchant_rules")
    .update({ purpose_id: destinationId })
    .eq("purpose_id", sourceId);

  if (ruleError) throw ruleError;

  const { error: deleteError } = await supabase
    .from("purposes")
    .delete()
    .eq("id", sourceId);

  if (deleteError) throw deleteError;

  return true;
}

export async function mergeTags(sourceId, destinationId) {
  if (sourceId === destinationId) {
    throw new Error("Scegli un'etichetta diversa.");
  }

  const { data: sourceLinks, error: linksError } = await supabase
    .from("transaction_tags")
    .select("transaction_id, user_id")
    .eq("tag_id", sourceId);

  if (linksError) throw linksError;

  if (sourceLinks?.length) {
    const newLinks = sourceLinks.map((link) => ({
      transaction_id: link.transaction_id,
      tag_id: destinationId,
      user_id: link.user_id,
    }));

    const { error: insertError } = await supabase
      .from("transaction_tags")
      .upsert(newLinks, {
        onConflict: "transaction_id,tag_id",
        ignoreDuplicates: true,
      });

    if (insertError) throw insertError;
  }

  const { error: deleteLinksError } = await supabase
    .from("transaction_tags")
    .delete()
    .eq("tag_id", sourceId);

  if (deleteLinksError) throw deleteLinksError;

  const { error: deleteTagError } = await supabase
    .from("tags")
    .delete()
    .eq("id", sourceId);

  if (deleteTagError) throw deleteTagError;

  return true;
}
