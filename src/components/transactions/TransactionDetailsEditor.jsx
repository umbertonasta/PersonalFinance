import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  LoaderCircle,
  Plus,
  Tag,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createCategory,
  createMicrocategory,
  createSubcategory,
  createTag,
  loadTaxonomy,
} from "@/lib/taxonomyDb";
import SimilarClassificationCheck from "@/components/transactions/SimilarClassificationCheck";
import {
  findSimilarClassifications,
  mostCommonClassification,
} from "@/lib/classificationSimilarity";

const emptyQuick = { type: null, name: "", icon: "", color: "#64748b" };

export default function TransactionDetailsEditor({
  transaction,
  mode = "edit",
  saving = false,
  onCancel,
  onSave,
  transactions = [],
}) {
  const [taxonomy, setTaxonomy] = useState({
    categories: [],
    subcategories: [],
    microcategories: [],
    tags: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quick, setQuick] = useState(emptyQuick);
  const [similarityCheck, setSimilarityCheck] = useState(null);
  const [remember, setRemember] = useState(
    Boolean(transaction?.normalized_merchant),
  );
  const [rememberMicrocategory, setRememberMicrocategory] = useState(false);
  const [showGuide, setShowGuide] = useState(
    () => localStorage.getItem("finance-classification-guide-seen") !== "true",
  );
  const [showAdvanced, setShowAdvanced] = useState(
    () => localStorage.getItem("finance-advanced-details-open") === "true",
  );
  const [form, setForm] = useState({
    type: transaction?.type || "expense",
    amount: transaction?.amount == null ? "" : String(transaction.amount),
    date: transaction?.date || new Date().toISOString().slice(0, 10),
    description: transaction?.description || "",
    categoryId: transaction?.category_id || "",
    subcategoryId: transaction?.subcategory_id || "",
    microcategoryId: transaction?.microcategory_id || "",
    tagIds: transaction?.tag_ids || [],
    notes: transaction?.notes || "",
    recurring: Boolean(transaction?.recurring),
  });

  async function refreshTaxonomy() {
    setLoading(true);
    try {
      const data = await loadTaxonomy({ includeHidden: false });
      setTaxonomy(data);
      setForm((current) => {
        if (current.categoryId) return current;
        const matching = data.categories.find(
          (item) => item.name === transaction?.category,
        );
        return { ...current, categoryId: matching?.id || "" };
      });
    } catch (loadError) {
      setError(
        loadError.message || "Impossibile caricare categorie e dettagli.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshTaxonomy();
  }, []);

  const availableCategories = useMemo(
    () => taxonomy.categories.filter((item) => !item.is_hidden),
    [taxonomy.categories],
  );
  const availableSubcategories = useMemo(
    () =>
      taxonomy.subcategories.filter(
        (item) => item.category_id === form.categoryId,
      ),
    [taxonomy.subcategories, form.categoryId],
  );
  const availableMicrocategories = useMemo(
    () =>
      taxonomy.microcategories.filter(
        (item) =>
          !item.subcategory_id || item.subcategory_id === form.subcategoryId,
      ),
    [taxonomy.microcategories, form.subcategoryId],
  );
  const selectedCategory = taxonomy.categories.find(
    (item) => item.id === form.categoryId,
  );

  function update(changes) {
    setForm((current) => ({ ...current, ...changes }));
  }

  async function createQuickItem() {
    if (!quick.name.trim()) return;
    try {
      if (quick.type === "category") {
        const created = await createCategory({
          name: quick.name,
          icon: quick.icon || "📦",
          color: quick.color,
          categoryType: "both",
        });
        await refreshTaxonomy();
        update({ categoryId: created.id, subcategoryId: "" });
      }
      if (quick.type === "subcategory") {
        if (!form.categoryId) throw new Error("Seleziona prima una categoria.");
        const created = await createSubcategory({
          categoryId: form.categoryId,
          name: quick.name,
          icon: quick.icon || null,
          color: quick.color,
        });
        await refreshTaxonomy();
        update({ subcategoryId: created.id });
      }
      if (quick.type === "microcategory") {
        const created = await createMicrocategory({
          subcategoryId: form.subcategoryId,
          name: quick.name,
          icon: quick.icon || null,
          color: quick.color,
        });
        await refreshTaxonomy();
        update({ microcategoryId: created.id });
      }
      if (quick.type === "tag") {
        const created = await createTag({
          name: quick.name,
          color: quick.color,
        });
        await refreshTaxonomy();
        update({ tagIds: [...new Set([...form.tagIds, created.id])] });
      }
      setQuick(emptyQuick);
    } catch (createError) {
      setError(createError.message || "Creazione non riuscita.");
    }
  }

  function buildSubmission() {
    const amount = Number(String(form.amount).replace(",", "."));
    if (!amount || amount <= 0 || !form.description.trim() || !form.date) {
      setError("Compila descrizione, data e importo.");
      return null;
    }
    if (!form.categoryId) {
      setError("Seleziona una categoria.");
      return null;
    }
    return {
      ...form,
      amount,
      description: form.description.trim(),
      rawDescription: transaction?.raw_description || form.description.trim(),
      category: selectedCategory?.name || null,
      remember,
      rememberMicrocategory,
    };
  }

  function submit() {
    setError("");
    const candidate = buildSubmission();
    if (!candidate) return;
    const matches = findSimilarClassifications({
      candidate,
      transactions,
      currentId: transaction?.id,
    });
    if (matches.length) {
      setSimilarityCheck({ candidate, matches });
      return;
    }
    onSave(candidate);
  }

  function usePreviousClassification(previousTransaction) {
    const nextForm = {
      ...form,
      categoryId: previousTransaction.category_id || "",
      subcategoryId: previousTransaction.subcategory_id || "",
      microcategoryId: previousTransaction.microcategory_id || "",
    };
    setForm(nextForm);
    setSimilarityCheck(null);
    setError(
      "Classificazione precedente applicata. Controlla e premi nuovamente Salva.",
    );
  }
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600 dark:text-emerald-400">
            {mode === "review"
              ? "Classificazione completa"
              : transaction?.id
                ? "Modifica movimento"
                : "Nuovo movimento"}
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
            {mode === "review"
              ? "Dai un significato alla spesa"
              : "Dettagli del movimento"}
          </h2>
          {transaction?.raw_description && (
            <p className="mt-2 break-words text-xs leading-5 text-slate-500 dark:text-slate-400">
              {transaction.raw_description}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800"
          aria-label="Chiudi"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/45">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <CircleHelp
            size={17}
            className="text-blue-500 dark:text-emerald-400"
          />
          <span>
            Non serve compilare tutto: categoria e sottocategoria bastano nella
            maggior parte dei casi.
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowGuide((current) => !current)}
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-black text-blue-600 hover:bg-blue-50 dark:text-emerald-400 dark:hover:bg-slate-700"
        >
          {showGuide ? "Nascondi" : "Come funziona?"}
        </button>
      </div>

      {showGuide && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
          <div className="grid gap-3 sm:grid-cols-2">
            <GuideItem
              title="Categoria"
              question="In quale area della tua vita rientra?"
              example="Trasporti, Alimentari, Shopping"
            />
            <GuideItem
              title="Sottocategoria"
              question="Che cosa hai acquistato nello specifico?"
              example="Benzina, Treno, Aereo"
            />
            <GuideItem
              title="Microcategoria"
              question="Per quale motivo hai sostenuto la spesa?"
              example="Viaggio, Lavoro, Regalo"
            />
            <GuideItem
              title="Etichette"
              question="Come vuoi ritrovarla in seguito?"
              example="Rate, Condivisa, Rimborsabile"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              localStorage.setItem("finance-classification-guide-seen", "true");
              setShowGuide(false);
            }}
            className="mt-4 rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white dark:bg-emerald-400 dark:text-slate-950"
          >
            Ho capito
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      )}
      {loading ? (
        <div className="grid min-h-48 place-items-center">
          <LoaderCircle className="animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <select
                value={form.type}
                onChange={(event) =>
                  update({
                    type: event.target.value,
                    categoryId: "",
                    subcategoryId: "",
                  })
                }
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-emerald-400 dark:focus:ring-emerald-400/10"
              >
                <option value="expense">Spesa</option>
                <option value="income">Entrata</option>
              </select>
            </Field>
            <Field label="Importo">
              <Input
                inputMode="decimal"
                value={form.amount}
                onChange={(event) => update({ amount: event.target.value })}
                className="h-12"
              />
            </Field>
          </div>
          <Field label="Descrizione">
            <Input
              value={form.description}
              onChange={(event) => update({ description: event.target.value })}
              className="h-12"
            />
          </Field>
          <Field label="Data">
            <Input
              type="date"
              value={form.date}
              onChange={(event) => update({ date: event.target.value })}
              className="h-12"
            />
          </Field>

          <Picker
            label="Categoria"
            question="In quale area della tua vita rientra questa spesa?"
            examples="Trasporti, Alimentari, Shopping, Tempo libero"
            placeholder="Seleziona l’area generale"
            value={form.categoryId}
            onChange={(value) =>
              update({
                categoryId: value,
                subcategoryId: "",
                microcategoryId: "",
              })
            }
            items={availableCategories}
            onAdd={() =>
              setQuick({ ...emptyQuick, type: "category", icon: "📦" })
            }
          />
          <Picker
            label="Sottocategoria"
            question="Che cosa hai acquistato o utilizzato nello specifico?"
            examples={subcategoryExamples(selectedCategory?.name)}
            placeholder="Seleziona il tipo preciso"
            value={form.subcategoryId}
            onChange={(value) =>
              update({ subcategoryId: value, microcategoryId: "" })
            }
            items={availableSubcategories}
            disabled={!form.categoryId}
            optional
            onAdd={() => setQuick({ ...emptyQuick, type: "subcategory" })}
          />

          <button
            type="button"
            onClick={() => {
              setShowAdvanced((current) => {
                localStorage.setItem(
                  "finance-advanced-details-open",
                  String(!current),
                );
                return !current;
              });
            }}
            className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-left transition hover:border-blue-300 dark:border-slate-700 dark:bg-slate-800/45 dark:hover:border-emerald-400/40"
            aria-expanded={showAdvanced}
          >
            <span>
              <strong className="block text-sm text-slate-950 dark:text-white">
                Aggiungi contesto e altri dettagli
              </strong>
              <span className="mt-1 block text-xs text-slate-400">
                Microcategoria, etichette e note sono facoltative.
              </span>
            </span>
            {showAdvanced ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {showAdvanced && (
            <div className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50/45 p-4 dark:border-slate-700 dark:bg-slate-800/25">
              <Picker
                label="Microcategoria"
                question="Che cosa hai acquistato o pagato nello specifico?"
                examples="Cura personale, Elettronica, Benzina, Abbigliamento"
                placeholder="Nessuna microcategoria"
                value={form.microcategoryId}
                onChange={(value) => update({ microcategoryId: value })}
                items={availableMicrocategories}
                disabled={!form.subcategoryId}
                optional
                onAdd={() => setQuick({ ...emptyQuick, type: "microcategory" })}
              />

              <Field
                label="Etichette"
                question="Vuoi aggiungere informazioni utili per ritrovare questa spesa?"
                hint="Puoi selezionarne più di una. Esempi: Rate, Condivisa, Rimborsabile, Weekend."
              >
                <div className="flex flex-wrap gap-2">
                  {taxonomy.tags.map((tag) => {
                    const selected = form.tagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() =>
                          update({
                            tagIds: selected
                              ? form.tagIds.filter((id) => id !== tag.id)
                              : [...form.tagIds, tag.id],
                          })
                        }
                        className={`rounded-full border px-3 py-1.5 text-xs font-bold ${selected ? "border-emerald-400 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300" : "border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400"}`}
                      >
                        <Tag size={12} className="mr-1 inline" />
                        {tag.name}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setQuick({ ...emptyQuick, type: "tag" })}
                    className="rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-500 dark:border-slate-700"
                  >
                    <Plus size={12} className="mr-1 inline" />
                    Nuova
                  </button>
                </div>
              </Field>

              <Field
                label="Note"
                question="C’è qualcosa che vorrai ricordare quando rivedrai questa spesa?"
                hint="Private e mai utilizzate per classificare automaticamente altri movimenti."
              >
                <textarea
                  value={form.notes}
                  onChange={(event) => update({ notes: event.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-emerald-400 dark:focus:ring-emerald-400/10"
                  placeholder="Es. regalo acquistato in 3 rate con Klarna"
                />
              </Field>
            </div>
          )}

          {mode === "review" && (
            <div className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
              <CheckRow
                checked={remember}
                onChange={setRemember}
                title="Ricorda esercente, categoria e sottocategoria"
              />
              <CheckRow
                checked={rememberMicrocategory}
                onChange={setRememberMicrocategory}
                title="Ricorda anche la microcategoria"
                disabled={!remember || !form.microcategoryId}
              />
            </div>
          )}

          <Button
            className="h-12 w-full rounded-2xl"
            onClick={submit}
            disabled={saving}
          >
            {saving ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Check size={18} />
            )}
            {saving
              ? "Salvataggio"
              : mode === "review"
                ? "Conferma classificazione"
                : "Salva movimento"}
          </Button>
        </>
      )}

      {similarityCheck && (
        <SimilarClassificationCheck
          matches={similarityCheck.matches}
          taxonomy={taxonomy}
          candidate={similarityCheck.candidate}
          onUsePrevious={usePreviousClassification}
          onContinue={() => {
            const candidate = similarityCheck.candidate;
            setSimilarityCheck(null);
            onSave(candidate);
          }}
          onCancel={() => setSimilarityCheck(null)}
        />
      )}
      {quick.type && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onMouseDown={() => setQuick(emptyQuick)}
        >
          <div
            className="w-full max-w-md rounded-t-[2rem] border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900 sm:rounded-[2rem]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h3 className="text-xl font-black text-slate-950 dark:text-white">
              Nuova {labelForQuick(quick.type)}
            </h3>
            <div className="mt-5 space-y-4">
              <Input
                value={quick.name}
                onChange={(event) =>
                  setQuick({ ...quick, name: event.target.value })
                }
                placeholder="Nome"
                className="h-12"
                autoFocus
              />
              {quick.type !== "tag" && (
                <Input
                  value={quick.icon}
                  onChange={(event) =>
                    setQuick({ ...quick, icon: event.target.value })
                  }
                  placeholder="Icona facoltativa"
                  className="h-12"
                />
              )}
              <div className="flex gap-3">
                <input
                  type="color"
                  value={quick.color}
                  onChange={(event) =>
                    setQuick({ ...quick, color: event.target.value })
                  }
                  className="h-12 w-16 rounded-xl"
                />
                <Input
                  value={quick.color}
                  onChange={(event) =>
                    setQuick({ ...quick, color: event.target.value })
                  }
                  className="h-12 font-mono"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setQuick(emptyQuick)}>
                Annulla
              </Button>
              <Button onClick={createQuickItem}>
                <Plus size={16} />
                Crea
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, question, hint, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-black text-slate-800 dark:text-slate-200">
        {label}
      </span>
      {question && (
        <span className="mt-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
          {question}
        </span>
      )}
      {hint && (
        <span className="mb-2 mt-1 block text-xs text-slate-400">{hint}</span>
      )}
      {!hint && <span className="mb-2 block" />}
      {children}
    </label>
  );
}

function Picker({
  label,
  question,
  examples,
  placeholder,
  value,
  onChange,
  items,
  onAdd,
  optional,
  disabled,
}) {
  return (
    <Field
      label={label}
      question={question}
      hint={
        examples
          ? `Esempi: ${examples}${optional ? " · Facoltativa" : ""}`
          : optional
            ? "Facoltativa"
            : undefined
      }
    >
      <div className="flex gap-2">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="h-12 w-full flex-1 rounded-xl border border-slate-200 bg-white px-3 text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-emerald-400 dark:focus:ring-emerald-400/10"
        >
          <option value="">
            {placeholder || (optional ? "Nessuna" : "Seleziona")}
          </option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.icon || "•"} {item.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onAdd}
          disabled={disabled}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-blue-400 hover:text-blue-600 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-emerald-400 dark:hover:text-emerald-400"
          aria-label={`Aggiungi ${label.toLowerCase()}`}
          title={`Aggiungi ${label.toLowerCase()}`}
        >
          <Plus size={18} />
        </button>
      </div>
    </Field>
  );
}

function GuideItem({ title, question, example }) {
  return (
    <div className="rounded-xl bg-white/70 p-3 dark:bg-slate-900/40">
      <strong className="text-sm text-blue-950 dark:text-blue-100">
        {title}
      </strong>
      <p className="mt-1 text-xs text-blue-800/80 dark:text-blue-200/80">
        {question}
      </p>
      <p className="mt-2 text-[11px] font-bold text-blue-600 dark:text-emerald-400">
        Es. {example}
      </p>
    </div>
  );
}

function subcategoryExamples(categoryName) {
  const examples = {
    Trasporti: "Benzina, Treno, Autobus, Aereo, Parcheggio",
    Alimentari: "Supermercato, Panetteria, Spesa veloce, Bevande",
    Shopping: "Abbigliamento, Elettronica, Casa, Regali",
    "Tempo libero": "Ristorante, Bar, Cinema, Eventi, Gaming",
    Abbonamenti: "Musica, Streaming, Cloud, Software, Telefonia",
    Salute: "Farmacia, Medico, Dentista, Esami, Cura personale",
  };
  return (
    examples[categoryName] || "Scegli un dettaglio coerente con la categoria"
  );
}

function CheckRow({ checked, onChange, title, disabled }) {
  return (
    <label
      className={`flex items-center justify-between gap-4 ${disabled ? "opacity-50" : ""}`}
    >
      <span className="text-sm font-bold text-blue-950 dark:text-blue-100">
        {title}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        className="h-5 w-5 accent-emerald-500"
      />
    </label>
  );
}
function labelForQuick(type) {
  return {
    category: "categoria",
    subcategory: "sottocategoria",
    microcategory: "microcategoria",
    tag: "etichetta",
  }[type];
}
